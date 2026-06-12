import express from "express";
import {
  getStats,
  getIssues,
  getAreas,
  getAnalytics,
  bulkUpdate,
  exportCsv,
  getImpactSimulation,
} from "../controllers/authorityController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";
import { validateBulkUpdate } from "../middleware/validationMiddleware.js";

const router = express.Router();

// All authority endpoints require a valid authenticated session
router.use(protect);

router.get("/stats", restrictTo("supervisor", "admin"), getStats);
router.get("/issues", restrictTo("operator", "supervisor", "admin"), getIssues);
router.get("/areas", restrictTo("supervisor", "admin"), getAreas);
router.get("/analytics", restrictTo("supervisor", "admin"), getAnalytics);
router.post("/bulk-update", restrictTo("operator", "supervisor", "admin"), validateBulkUpdate, bulkUpdate);
router.get("/export", restrictTo("supervisor", "admin"), exportCsv);
router.get("/impact-simulation", restrictTo("supervisor", "admin"), getImpactSimulation);

export default router;
