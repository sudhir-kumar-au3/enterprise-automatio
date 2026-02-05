import { Request, Response } from "express";
import { Meeting, MeetingDocument } from "../models";
import logger from "../utils/logger";

interface AuthRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: string;
    accessLevel: string;
  };
}

// Get all meetings for organization
export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { startDate, endDate, status, attendeeId } = req.query;

    const filter: Record<string, any> = { organizationId };

    // Date range filter
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.startTime.$lte = new Date(endDate as string);
      }
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Attendee filter
    if (attendeeId) {
      filter.$or = [{ organizerId: attendeeId }, { attendeeIds: attendeeId }];
    }

    const meetings = await Meeting.find(filter).sort({ startTime: 1 }).lean();

    res.json({ success: true, data: meetings });
  } catch (error) {
    logger.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
};

// Get single meeting
export const getMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const meeting = await Meeting.findOne({ _id: id, organizationId }).lean();

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    logger.error("Error fetching meeting:", error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
};

// Create meeting
export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      title,
      description,
      meetingType,
      startTime,
      endTime,
      duration,
      location,
      meetingLink,
      platform,
      attendeeIds,
      isRecurring,
      recurrencePattern,
      recurrenceEndDate,
      linkedTaskIds,
      reminderMinutes,
      color,
      notes,
    } = req.body;

    if (!title || !startTime || !endTime || !duration) {
      return res
        .status(400)
        .json({
          error: "Title, start time, end time, and duration are required",
        });
    }

    const meeting = new Meeting({
      organizationId,
      title,
      description,
      meetingType: meetingType || "custom",
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      location,
      meetingLink,
      platform,
      status: "scheduled",
      organizerId: userId,
      attendeeIds: attendeeIds || [],
      isRecurring: isRecurring || false,
      recurrencePattern: recurrencePattern || "none",
      recurrenceEndDate: recurrenceEndDate
        ? new Date(recurrenceEndDate)
        : undefined,
      linkedTaskIds: linkedTaskIds || [],
      reminderMinutes: reminderMinutes || [15],
      color,
      notes,
    });

    await meeting.save();

    // If recurring, create future instances
    if (isRecurring && recurrencePattern && recurrencePattern !== "none") {
      await createRecurringInstances(meeting, recurrenceEndDate);
    }

    logger.info(`Meeting created: ${meeting._id} by user ${userId}`);
    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    logger.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};

// Update meeting
export const updateMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const meeting = await Meeting.findOne({ _id: id, organizationId });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const allowedUpdates = [
      "title",
      "description",
      "meetingType",
      "startTime",
      "endTime",
      "duration",
      "location",
      "meetingLink",
      "platform",
      "status",
      "attendeeIds",
      "linkedTaskIds",
      "reminderMinutes",
      "color",
      "notes",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === "startTime" || field === "endTime") {
          (meeting as any)[field] = new Date(req.body[field]);
        } else {
          (meeting as any)[field] = req.body[field];
        }
      }
    });

    await meeting.save();

    logger.info(`Meeting updated: ${id}`);
    res.json({ success: true, data: meeting });
  } catch (error) {
    logger.error("Error updating meeting:", error);
    res.status(500).json({ error: "Failed to update meeting" });
  }
};

// Delete meeting
export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { deleteRecurring } = req.query;

    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const meeting = await Meeting.findOne({ _id: id, organizationId });

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    // If it's a recurring meeting and deleteRecurring is true, delete all instances
    if (deleteRecurring === "true" && meeting.isRecurring) {
      await Meeting.deleteMany({
        $or: [{ _id: id }, { parentMeetingId: id }],
        organizationId,
      });
      logger.info(`Recurring meeting and instances deleted: ${id}`);
    } else {
      await Meeting.deleteOne({ _id: id, organizationId });
      logger.info(`Meeting deleted: ${id}`);
    }

    res.json({ success: true, message: "Meeting deleted" });
  } catch (error) {
    logger.error("Error deleting meeting:", error);
    res.status(500).json({ error: "Failed to delete meeting" });
  }
};

// Get meetings for a specific date range (calendar view)
export const getCalendarMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { start, end } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({ error: "Start and end dates are required" });
    }

    const meetings = await Meeting.find({
      organizationId,
      startTime: {
        $gte: new Date(start as string),
        $lte: new Date(end as string),
      },
      status: { $ne: "cancelled" },
    })
      .sort({ startTime: 1 })
      .lean();

    res.json({ success: true, data: meetings });
  } catch (error) {
    logger.error("Error fetching calendar meetings:", error);
    res.status(500).json({ error: "Failed to fetch calendar meetings" });
  }
};

// Link tasks to meeting
export const linkTasksToMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { taskIds } = req.body;

    if (!organizationId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const meeting = await Meeting.findOneAndUpdate(
      { _id: id, organizationId },
      { $addToSet: { linkedTaskIds: { $each: taskIds } } },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({ success: true, data: meeting });
  } catch (error) {
    logger.error("Error linking tasks to meeting:", error);
    res.status(500).json({ error: "Failed to link tasks" });
  }
};

// Helper function to create recurring meeting instances
async function createRecurringInstances(
  parentMeeting: MeetingDocument,
  endDate?: string
): Promise<void> {
  const maxInstances = 52; // Max 1 year of weekly meetings
  const instances: Partial<MeetingDocument>[] = [];

  let currentStart = new Date(parentMeeting.startTime);
  let currentEnd = new Date(parentMeeting.endTime);
  const finalEndDate = endDate
    ? new Date(endDate)
    : new Date(currentStart.getTime() + 365 * 24 * 60 * 60 * 1000);

  const getNextDate = (date: Date, pattern: string): Date => {
    const next = new Date(date);
    switch (pattern) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "biweekly":
        next.setDate(next.getDate() + 14);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  };

  for (let i = 0; i < maxInstances; i++) {
    currentStart = getNextDate(currentStart, parentMeeting.recurrencePattern);
    currentEnd = getNextDate(currentEnd, parentMeeting.recurrencePattern);

    if (currentStart > finalEndDate) break;

    instances.push({
      organizationId: parentMeeting.organizationId,
      title: parentMeeting.title,
      description: parentMeeting.description,
      meetingType: parentMeeting.meetingType,
      startTime: new Date(currentStart),
      endTime: new Date(currentEnd),
      duration: parentMeeting.duration,
      location: parentMeeting.location,
      meetingLink: parentMeeting.meetingLink,
      platform: parentMeeting.platform,
      status: "scheduled",
      organizerId: parentMeeting.organizerId,
      attendeeIds: parentMeeting.attendeeIds,
      isRecurring: true,
      recurrencePattern: parentMeeting.recurrencePattern,
      parentMeetingId: parentMeeting._id?.toString(),
      linkedTaskIds: [],
      reminderMinutes: parentMeeting.reminderMinutes,
      color: parentMeeting.color,
    });
  }

  if (instances.length > 0) {
    await Meeting.insertMany(instances);
    logger.info(
      `Created ${instances.length} recurring meeting instances for meeting ${parentMeeting._id}`
    );
  }
}
