import { Response } from "express";
import { validationResult } from "express-validator";
import { Comment, Activity } from "../models";
import {
  AuthenticatedRequest,
  ApiResponse,
  CommentFilterQuery,
} from "../types";
import { asyncHandler, AppError } from "../middleware";
import logger from "../utils/logger";

// Get all comments with filtering
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

    const query: any = {};

    if (contextType) query.contextType = contextType;
    if (contextId) query.contextId = contextId;
    if (authorId) query.authorId = authorId;
    if (isResolved !== undefined)
      query.isResolved = String(isResolved) === "true";

    const skip = (Number(page) - 1) * Number(limit);
    const sort: any = { [sortBy as string]: sortOrder === "asc" ? 1 : -1 };

    const [comments, total] = await Promise.all([
      Comment.find(query).sort(sort).skip(skip).limit(Number(limit)),
      Comment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    } as ApiResponse);
  }
);

// Get single comment
export const getComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    res.json({
      success: true,
      data: comment,
    } as ApiResponse);
  }
);

// Create comment
export const createComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const commentData = {
      ...req.body,
      authorId: req.user?.userId,
      timestamp: Date.now(),
    };

    const comment = await Comment.create(commentData);

    // Create activity log
    await Activity.create({
      userId: req.user?.userId,
      type: "comment",
      timestamp: Date.now(),
      contextType: comment.contextType,
      contextId: comment.contextId,
      content: comment.content.substring(0, 100),
      metadata: { commentId: comment._id.toString() },
    });

    // Create mention activities
    if (comment.mentions && comment.mentions.length > 0) {
      await Promise.all(
        comment.mentions.map((mentionedUserId: string) =>
          Activity.create({
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
          })
        )
      );
    }

    logger.info(`Comment created by ${req.user?.email}`);

    res.status(201).json({
      success: true,
      data: comment,
      message: "Comment created successfully",
    } as ApiResponse);
  }
);

// Update comment
export const updateComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await Comment.findById(req.params.id);

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

    res.json({
      success: true,
      data: comment,
      message: "Comment updated successfully",
    } as ApiResponse);
  }
);

// Delete comment
export const deleteComment = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    await Comment.findByIdAndDelete(req.params.id);

    logger.info(`Comment deleted by ${req.user?.email}`);

    res.json({
      success: true,
      message: "Comment deleted successfully",
    } as ApiResponse);
  }
);

// Toggle resolve status
export const toggleResolve = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    comment.isResolved = !comment.isResolved;
    await comment.save();

    res.json({
      success: true,
      data: comment,
      message: comment.isResolved ? "Comment resolved" : "Comment reopened",
    } as ApiResponse);
  }
);

// Add reaction
export const addReaction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { emoji } = req.body;

    if (!emoji) {
      throw new AppError("Emoji is required", 400);
    }

    const comment = await Comment.findById(req.params.id);

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

    res.json({
      success: true,
      data: comment,
      message: "Reaction added",
    } as ApiResponse);
  }
);

// Remove reaction
export const removeReaction = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    comment.reactions = comment.reactions.filter(
      (r) => r.userId !== req.user?.userId
    );
    await comment.save();

    res.json({
      success: true,
      data: comment,
      message: "Reaction removed",
    } as ApiResponse);
  }
);

// Add reply
export const addReply = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((e) => ({ field: e.type, message: e.msg })),
      } as ApiResponse);
    }

    const parentComment = await Comment.findById(req.params.id);

    if (!parentComment) {
      throw new AppError("Parent comment not found", 404);
    }

    // Create reply as a new comment
    const reply = await Comment.create({
      ...req.body,
      authorId: req.user?.userId,
      timestamp: Date.now(),
      contextType: parentComment.contextType,
      contextId: parentComment.contextId,
    });

    // Add reply reference to parent
    parentComment.replies.push(reply._id);
    await parentComment.save();

    res.status(201).json({
      success: true,
      data: reply,
      message: "Reply added",
    } as ApiResponse);
  }
);
