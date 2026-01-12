import { Router } from "express";
import authRoutes from "./authRoutes";
import taskRoutes from "./taskRoutes";
import commentRoutes from "./commentRoutes";
import teamRoutes from "./teamRoutes";
import dataRoutes from "./dataRoutes";
import {
  livenessProbe,
  readinessProbe,
  healthCheck,
  metricsEndpoint,
  appInfo,
} from "../controllers/healthController";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/tasks", taskRoutes);
router.use("/comments", commentRoutes);
router.use("/team", teamRoutes);
router.use("/data", dataRoutes);

// Health & Observability endpoints
router.get("/health", healthCheck); // Detailed health status
router.get("/health/live", livenessProbe); // Kubernetes liveness probe
router.get("/health/ready", readinessProbe); // Kubernetes readiness probe
router.get("/metrics", metricsEndpoint); // Prometheus metrics
router.get("/info", appInfo); // Application info

export default router;
