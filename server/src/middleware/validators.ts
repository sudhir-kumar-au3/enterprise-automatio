import { body, param, query } from "express-validator";

// Task validators
export const createTaskValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),
  body("status")
    .optional()
    .isIn(["todo", "in-progress", "review", "done"])
    .withMessage("Invalid status"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid priority"),
  body("assigneeId")
    .optional()
    .isString()
    .withMessage("Assignee ID must be a string"),
  body("contextType")
    .optional()
    .isIn(["service", "workflow", "roadmap", "general"])
    .withMessage("Invalid context type"),
  body("dueDate")
    .optional()
    .isNumeric()
    .withMessage("Due date must be a timestamp"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("dependencies")
    .optional()
    .isArray()
    .withMessage("Dependencies must be an array"),
];

export const updateTaskValidator = [
  param("id").notEmpty().withMessage("Task ID is required"),
  body("title")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Title cannot exceed 200 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),
  body("status")
    .optional()
    .isIn(["todo", "in-progress", "review", "done"])
    .withMessage("Invalid status"),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "critical"])
    .withMessage("Invalid priority"),
];

// Comment validators
export const createCommentValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ max: 5000 })
    .withMessage("Content cannot exceed 5000 characters"),
  body("contextType")
    .optional()
    .isIn(["service", "workflow", "roadmap", "general"])
    .withMessage("Invalid context type"),
  body("contextId")
    .optional()
    .isString()
    .withMessage("Context ID must be a string"),
  body("mentions")
    .optional()
    .isArray()
    .withMessage("Mentions must be an array"),
];

// Team member validators
export const createTeamMemberValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["architect", "developer", "devops", "product"])
    .withMessage("Invalid role"),
  body("accessLevel")
    .optional()
    .isIn(["owner", "admin", "member", "viewer"])
    .withMessage("Invalid access level"),
];

export const updateTeamMemberValidator = [
  param("id").notEmpty().withMessage("Member ID is required"),
  body("name")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("email").optional().trim().isEmail().withMessage("Invalid email format"),
  body("role")
    .optional()
    .isIn(["architect", "developer", "devops", "product"])
    .withMessage("Invalid role"),
  body("accessLevel")
    .optional()
    .isIn(["owner", "admin", "member", "viewer"])
    .withMessage("Invalid access level"),
];

// Auth validators
export const loginValidator = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const registerValidator = [...createTeamMemberValidator];

// Pagination validators
export const paginationValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sortBy")
    .optional()
    .isString()
    .withMessage("Sort field must be a string"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
];

// ID validator
export const idValidator = [
  param("id").notEmpty().withMessage("ID is required"),
];
