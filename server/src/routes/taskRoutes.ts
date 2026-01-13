import { Router } from "express";
import { taskController } from "../controllers";
import { authenticate, requirePermission } from "../middleware";
import {
  createTaskValidator,
  updateTaskValidator,
  paginationValidator,
  idValidator,
} from "../middleware/validators";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all tasks with filtering
router.get("/", paginationValidator, taskController.getTasks);

// Get current user's assigned tasks
router.get("/my-tasks", paginationValidator, taskController.getMyTasks);

// Get single task
router.get("/:id", idValidator, taskController.getTask);

// Create task
router.post(
  "/",
  requirePermission("create_tasks"),
  createTaskValidator,
  taskController.createTask
);

// Update task
router.put("/:id", idValidator, updateTaskValidator, taskController.updateTask);

// Delete task
router.delete(
  "/:id",
  requirePermission("delete_tasks"),
  idValidator,
  taskController.deleteTask
);

// Update task status
router.patch("/:id/status", idValidator, taskController.updateTaskStatus);

// Update task dependencies
router.patch(
  "/:id/dependencies",
  idValidator,
  taskController.updateTaskDependencies
);

// Bulk update tasks
router.post(
  "/bulk-update",
  requirePermission("edit_all_tasks"),
  taskController.bulkUpdateTasks
);

export default router;
