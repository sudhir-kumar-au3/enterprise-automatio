import { Response } from "express";
import { validationResult } from "express-validator";
import { Comment, Activity } from "../models";
import {
  AuthenticatedRequest,
  ApiResponse,
  CommentFilterQuery,
} from "../types";
import { asyncHandler, AppError } from "../middleware";
import { cacheService } from "../services/cache.service";
import { wsService } from "../services/websocket.service";
import { jobQueue } from "../services/jobQueue.service";
import logger from "../utils/logger";

// Helper to transform lean query results - converts _id to id
const transformLeanDoc = <T extends { _id?: any; id?: string }>(
  doc: T
): T & { id: string } => {
  if (!doc) return doc;
  const transformed = { ...doc } as T & { id: string };
  if (doc._id) {
    transformed.id = doc._id.toString();
    delete (transformed as any)._id;
  }
  delete (transformed as any).__v;
  return transformed;
};

const transformLeanDocs = <T extends { _id?: any; id?: string }>(
  docs: T[]
): (T & { id: string })[] => {
  return docs.map(transformLeanDoc);
};

// Get all comments with filtering and caching - UPDATED for multi-tenancy
export const getComments = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const {
      page = 1,
      limit = 50,
      sortBy = "timestamp",
      sortOrder = "desc",
      contextType,
      contextId,
      authorId,
      isResolved,
    } = req.query as CommentFilterQuery;

    // Get organizationId from authenticated user
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    // Create cache key from filters including organizationId
    const cacheKey = `comments:${organizationId}:${JSON.stringify(req.query)}`;

    const result = await cacheService.getOrSet(
      cacheKey,
      async () => {
        // Always scope by organizationId
        const query: any = { organizationId };

        if (contextType) query.contextType = contextType;
        if (contextId) query.contextId = contextId;
        if (authorId) query.authorId = authorId;
        if (isResolved !== undefined)
          query.isResolved = String(isResolved) === "true";

        const skip = (Number(page) - 1) * Number(limit);
        const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };

        const [comments, total] = await Promise.all([
          Comment.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
          Comment.countDocuments(query),
        ]);

        return {
          comments: transformLeanDocs(comments),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        };
      },
      { ttl: 30, tags: ["comments"] }
    );

    res.json({
      success: true,
      data: result.comments,
      pagination: result.pagination,
    } as ApiResponse);
  }
);

// Get single comment - UPDATED for multi-tenancy
export const getComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    }).lean();

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    res.json({
      success: true,
      data: transformLeanDoc(comment),
    } as ApiResponse);
  }
);

// Create comment with WebSocket broadcast and notifications - UPDATED for multi-tenancy
export const createComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const commentData = {
      ...req.body,
      organizationId, // Add organizationId to comment
      authorId: req.user?.userId,
      timestamp: Date.now(),
    };

    const comment = await Comment.create(commentData);
    const commentObj = comment.toJSON();

    // Create activity log with organizationId
    await Activity.create({
      organizationId,
      userId: req.user?.userId,
      type: "comment",
      timestamp: Date.now(),
      contextType: comment.contextType,
      contextId: comment.contextId,
      content: comment.content.substring(0, 100),
      metadata: { commentId: comment._id.toString() },
    });

    // Invalidate comments cache
    await cacheService.invalidateByTag("comments");

    // Broadcast via WebSocket
    await wsService.notifyCommentAdded(commentObj, req.user?.userId!);

    // Create mention activities and send notifications
    if (comment.mentions && comment.mentions.length > 0) {
      await Promise.all(
        comment.mentions.map(async (mentionedUserId: string) => {
          // Create activity with organizationId
          await Activity.create({
            organizationId,
            userId: mentionedUserId,
            type: "mention",
            timestamp: Date.now(),
            contextType: comment.contextType,
            contextId: comment.contextId,
            content: `You were mentioned by ${req.user?.email}`,
            metadata: {
              commentId: comment._id.toString(),
              mentionedBy: req.user?.userId,
            },
          });

          // Send real-time notification
          if (mentionedUserId !== req.user?.userId) {
            await wsService.broadcastToUser(mentionedUserId, "notification", {
              title: "You were mentioned",
              message: `${req.user?.email} mentioned you in a comment`,
              type: "info",
              action: {
                label: "View Comment",
                url: `/${comment.contextType}/${comment.contextId}`,
              },
            });

            // Queue notification for persistence
            try {
              await jobQueue.sendNotification({
                userId: mentionedUserId,
                title: "You were mentioned",
                message: `${req.user?.email} mentioned you in a comment`,
                type: "info",
              });
            } catch (error) {
              logger.warn("Failed to queue mention notification", error);
            }
          }
        })
      );
    }

    logger.info(
      `Comment created by ${req.user?.email} in org: ${organizationId}`
    );

    res.status(201).json({
      success: true,
      data: commentObj,
      message: "Comment created successfully",
    } as ApiResponse);
  }
);

// Update comment - UPDATED for multi-tenancy
export const updateComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    // Only author can update their comment
    if (comment.authorId !== req.user?.userId) {
      throw new AppError("Not authorized to update this comment", 403);
    }

    const { content } = req.body;
    if (content) {
      comment.content = content;
    }

    await comment.save();

    // Invalidate cache
    await cacheService.invalidateByTag("comments");

    // Broadcast update
    const room = `${comment.contextType}:${comment.contextId}`;
    await wsService.broadcastToRoom(room, "comment:updated", {
      comment: comment.toJSON(),
      updatedBy: req.user?.userId,
    });

    res.json({
      success: true,
      data: comment.toJSON(),
      message: "Comment updated successfully",
    } as ApiResponse);
  }
);

// Delete comment - UPDATED for multi-tenancy
export const deleteComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    const contextType = comment.contextType;
    const contextId = comment.contextId;

    await Comment.findByIdAndDelete(req.params.id);

    // Invalidate cache
    await cacheService.invalidateByTag("comments");

    // Broadcast deletion
    const room = `${contextType}:${contextId}`;
    await wsService.broadcastToRoom(room, "comment:deleted", {
      commentId: req.params.id,
      deletedBy: req.user?.userId,
    });

    logger.info(`Comment deleted by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    } as ApiResponse);
  }
);

// Toggle resolve status with broadcast - UPDATED for multi-tenancy
export const toggleResolve = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    comment.isResolved = !comment.isResolved;
    await comment.save();

    // Invalidate cache
    await cacheService.invalidateByTag("comments");

    // Broadcast status change
    const room = `${comment.contextType}:${comment.contextId}`;
    await wsService.broadcastToRoom(room, "comment:resolved", {
      comment: comment.toJSON(),
      resolvedBy: req.user?.userId,
    });

    res.json({
      success: true,
      data: comment.toJSON(),
      message: comment.isResolved ? "Comment resolved" : "Comment reopened",
    } as ApiResponse);
  }
);

// Add reaction with real-time update - UPDATED for multi-tenancy
export const addReaction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emoji } = req.body;

    if (!emoji) {
      throw new AppError("Emoji is required", 400);
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    // Remove existing reaction from same user
    comment.reactions = comment.reactions.filter(
      (r) => r.userId !== req.user?.userId
    );

    // Add new reaction
    comment.reactions.push({ emoji, userId: req.user?.userId! });
    await comment.save();

    // Broadcast reaction
    const room = `${comment.contextType}:${comment.contextId}`;
    await wsService.broadcastToRoom(room, "comment:reaction", {
      commentId: comment._id.toString(),
      reactions: comment.reactions,
      addedBy: req.user?.userId,
    });

    res.json({
      success: true,
      data: comment.toJSON(),
      message: "Reaction added",
    } as ApiResponse);
  }
);

// Remove reaction - UPDATED for multi-tenancy
export const removeReaction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const comment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    comment.reactions = comment.reactions.filter(
      (r) => r.userId !== req.user?.userId
    );
    await comment.save();

    // Broadcast reaction removal
    const room = `${comment.contextType}:${comment.contextId}`;
    await wsService.broadcastToRoom(room, "comment:reaction", {
      commentId: comment._id.toString(),
      reactions: comment.reactions,
      removedBy: req.user?.userId,
    });

    res.json({
      success: true,
      data: comment.toJSON(),
      message: "Reaction removed",
    } as ApiResponse);
  }
);

// Add reply with notification - UPDATED for multi-tenancy
export const addReply = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new AppError("Organization context required", 400);
    }

    const parentComment = await Comment.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!parentComment) {
      throw new AppError("Parent comment not found", 404);
    }

    // Create reply as a new comment with organizationId
    const reply = await Comment.create({
      ...req.body,
      organizationId,
      authorId: req.user?.userId,
      timestamp: Date.now(),
      contextType: parentComment.contextType,
      contextId: parentComment.contextId,
    });

    // Add reply reference to parent
    parentComment.replies.push(reply._id);
    await parentComment.save();

    // Invalidate cache
    await cacheService.invalidateByTag("comments");

    // Broadcast reply
    const room = `${parentComment.contextType}:${parentComment.contextId}`;
    await wsService.broadcastToRoom(room, "comment:reply", {
      parentCommentId: parentComment._id.toString(),
      reply: reply.toJSON(),
      addedBy: req.user?.userId,
    });

    // Notify parent comment author
    if (parentComment.authorId !== req.user?.userId) {
      await wsService.broadcastToUser(parentComment.authorId, "notification", {
        title: "New reply to your comment",
        message: `${req.user?.email} replied to your comment`,
        type: "info",
      });
    }

    res.status(201).json({
      success: true,
      data: reply.toJSON(),
      message: "Reply added",
    } as ApiResponse);
  }
);
