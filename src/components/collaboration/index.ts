// Collaboration module exports
export { default as TasksView } from "./TasksView";
export { default as TaskCard } from "./TaskCard";
export { default as SortableTaskCard } from "./SortableTaskCard";
export { default as CommentsView } from "./CommentsView";
export { default as CommentCard } from "./CommentCard";
export { default as TeamView } from "./TeamView";
export { default as AddEditMemberDialog } from "./AddEditMemberDialog";
export { default as CreateTaskDialog } from "./CreateTaskDialog";
export { default as PermissionsDetailsDialog } from "./PermissionsDetailsDialog";
export { default as OverviewTab } from "./OverviewTab";

// Re-export types
export type { TasksViewProps } from "./TasksView";
export type { TaskCardProps } from "./TaskCard";
export type { SortableTaskCardProps } from "./SortableTaskCard";
export type { CommentCardProps } from "./CommentCard";
export type { CreateTaskDialogProps } from "./CreateTaskDialog";
export type { PermissionsDetailsDialogProps } from "./PermissionsDetailsDialog";
export type { OverviewTabProps } from "./OverviewTab";

// Re-export constants
export * from "./constants";
