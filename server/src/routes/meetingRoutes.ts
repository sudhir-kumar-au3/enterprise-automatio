import { Router } from "express";
import {
  getMeetings,
  getMeeting,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getCalendarMeetings,
  linkTasksToMeeting,
} from "../controllers/meetingController";
import { authenticate, requireAccessLevel } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all meetings
router.get("/", getMeetings);

// Get meetings for calendar view (date range)
router.get("/calendar", getCalendarMeetings);

// Get single meeting
router.get("/:id", getMeeting);

// Create meeting (member and above)
router.post("/", requireAccessLevel("member"), createMeeting);

// Update meeting (member and above)
router.put("/:id", requireAccessLevel("member"), updateMeeting);

// Delete meeting (admin and above)
router.delete("/:id", requireAccessLevel("admin"), deleteMeeting);

// Link tasks to meeting (member and above)
router.post("/:id/tasks", requireAccessLevel("member"), linkTasksToMeeting);

export default router;
