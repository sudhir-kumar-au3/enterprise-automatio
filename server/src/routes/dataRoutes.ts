import { Router } from "express";
import { dataController } from "../controllers";
import { authenticate, requirePermission } from "../middleware";
import { idValidator } from "../middleware/validators";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Statistics and analytics
router.get(
  "/statistics",
  requirePermission("view_analytics"),
  dataController.getStatistics
);
router.get(
  "/workload",
  requirePermission("view_analytics"),
  dataController.getWorkloadStats
);
router.get("/activity", dataController.getActivityTimeline);

// Export/Import
router.get(
  "/export",
  requirePermission("export_data"),
  dataController.exportData
);
router.post(
  "/import",
  requirePermission("export_data"),
  dataController.importData
);

// Backups
router.get("/backups", dataController.getBackups);
router.post("/backups", dataController.createBackup);
router.post("/backups/:id/restore", idValidator, dataController.restoreBackup);
router.delete("/backups/:id", idValidator, dataController.deleteBackup);

export default router;
