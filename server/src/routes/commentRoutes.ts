import { Router } from "express";
import { commentController } from "../controllers";
import { authenticate, requirePermission } from "../middleware";
import {
  createCommentValidator,
  paginationValidator,
  idValidator,
} from "../middleware/validators";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all comments with filtering
router.get("/", paginationValidator, commentController.getComments);

// Get single comment
router.get("/:id", idValidator, commentController.getComment);

// Create comment
router.post(
  "/",
  requirePermission("create_comments"),
  createCommentValidator,
  commentController.createComment
);

// Update comment
router.put("/:id", idValidator, commentController.updateComment);

// Delete comment
router.delete(
  "/:id",
  requirePermission("delete_comments"),
  idValidator,
  commentController.deleteComment
);

// Toggle resolve status
router.patch("/:id/resolve", idValidator, commentController.toggleResolve);

// Reactions
router.post("/:id/reactions", idValidator, commentController.addReaction);
router.delete("/:id/reactions", idValidator, commentController.removeReaction);

// Replies
router.post(
  "/:id/replies",
  idValidator,
  createCommentValidator,
  commentController.addReply
);

export default router;
