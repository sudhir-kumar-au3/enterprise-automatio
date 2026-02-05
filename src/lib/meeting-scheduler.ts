import { TeamMember } from "./collaboration-data";

export type MeetingType =
  | "team-review"
  | "sprint-planning"
  | "standup"
  | "one-on-one"
  | "retrospective"
  | "custom";
export type MeetingPlatform = "google" | "teams" | "outlook";

export interface MeetingDetails {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  attendees: TeamMember[];
  meetingType: MeetingType;
  location?: string;
  isRecurring?: boolean;
  recurrencePattern?: "daily" | "weekly" | "biweekly" | "monthly";
}

export interface MeetingTemplate {
  id: MeetingType;
  title: string;
  defaultDuration: number; // in minutes
  description: string;
  icon: string;
  suggestedAttendees?: "all" | "developers" | "leads" | "custom";
}

export const meetingTemplates: MeetingTemplate[] = [
  {
    id: "team-review",
    title: "Team Review",
    defaultDuration: 60,
    description:
      "Review team progress, discuss blockers, and align on priorities",
    icon: "👥",
    suggestedAttendees: "all",
  },
  {
    id: "sprint-planning",
    title: "Sprint Planning",
    defaultDuration: 120,
    description:
      "Plan upcoming sprint tasks, estimate effort, and assign ownership",
    icon: "📋",
    suggestedAttendees: "all",
  },
  {
    id: "standup",
    title: "Daily Standup",
    defaultDuration: 15,
    description: "Quick daily sync to share updates and identify blockers",
    icon: "☀️",
    suggestedAttendees: "all",
  },
  {
    id: "one-on-one",
    title: "One-on-One",
    defaultDuration: 30,
    description: "Personal check-in and feedback session",
    icon: "💬",
    suggestedAttendees: "custom",
  },
  {
    id: "retrospective",
    title: "Retrospective",
    defaultDuration: 90,
    description:
      "Reflect on what went well, what could improve, and action items",
    icon: "🔄",
    suggestedAttendees: "all",
  },
  {
    id: "custom",
    title: "Custom Meeting",
    defaultDuration: 30,
    description: "Create a custom meeting with your own settings",
    icon: "📅",
    suggestedAttendees: "custom",
  },
];

const formatGoogleCalendarDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

const formatOutlookDate = (date: Date): string => {
  return date.toISOString();
};

export const generateGoogleCalendarMeetingUrl = (
  meeting: MeetingDetails
): string => {
  const attendeeEmails = meeting.attendees.map((a) => a.email).join(",");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: meeting.title,
    details: meeting.description,
    dates: `${formatGoogleCalendarDate(
      meeting.startDate
    )}/${formatGoogleCalendarDate(meeting.endDate)}`,
    add: attendeeEmails,
  });

  if (meeting.location) {
    params.append("location", meeting.location);
  }

  // Add recurrence if specified
  if (meeting.isRecurring && meeting.recurrencePattern) {
    const recurrenceRules: Record<string, string> = {
      daily: "RRULE:FREQ=DAILY",
      weekly: "RRULE:FREQ=WEEKLY",
      biweekly: "RRULE:FREQ=WEEKLY;INTERVAL=2",
      monthly: "RRULE:FREQ=MONTHLY",
    };
    params.append("recur", recurrenceRules[meeting.recurrencePattern]);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const generateTeamsMeetingUrl = (meeting: MeetingDetails): string => {
  // Microsoft Teams deep link for scheduling a meeting
  // This opens the Teams calendar with pre-filled meeting details
  const attendeeEmails = meeting.attendees.map((a) => a.email).join(";");

  const params = new URLSearchParams({
    subject: meeting.title,
    body: meeting.description,
    startTime: formatOutlookDate(meeting.startDate),
    endTime: formatOutlookDate(meeting.endDate),
    attendees: attendeeEmails,
  });

  // Teams web scheduler URL
  return `https://teams.microsoft.com/l/meeting/new?${params.toString()}`;
};

export const generateOutlookCalendarUrl = (meeting: MeetingDetails): string => {
  // Outlook.com calendar URL for creating events
  const params = new URLSearchParams({
    rru: "addevent",
    subject: meeting.title,
    body: meeting.description,
    startdt: formatOutlookDate(meeting.startDate),
    enddt: formatOutlookDate(meeting.endDate),
    to: meeting.attendees.map((a) => a.email).join(";"),
    allday: "false",
    path: "/calendar/action/compose",
  });

  if (meeting.location) {
    params.append("location", meeting.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

export const generateOutlookDesktopUrl = (meeting: MeetingDetails): string => {
  // Outlook desktop protocol handler
  const attendeeEmails = meeting.attendees.map((a) => a.email).join(";");

  const params = new URLSearchParams({
    subject: meeting.title,
    body: meeting.description,
    startdt: formatOutlookDate(meeting.startDate),
    enddt: formatOutlookDate(meeting.endDate),
    to: attendeeEmails,
  });

  return `ms-outlook://compose?${params.toString()}`;
};

export const openMeetingScheduler = (
  platform: MeetingPlatform,
  meeting: MeetingDetails
): void => {
  let url: string;

  switch (platform) {
    case "google":
      url = generateGoogleCalendarMeetingUrl(meeting);
      break;
    case "teams":
      url = generateTeamsMeetingUrl(meeting);
      break;
    case "outlook":
      url = generateOutlookCalendarUrl(meeting);
      break;
    default:
      url = generateGoogleCalendarMeetingUrl(meeting);
  }

  window.open(url, "_blank", "noopener,noreferrer");
};

export const getDefaultMeetingTimes = (): { start: Date; end: Date } => {
  const now = new Date();
  // Round to next 30 minutes
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 30) * 30;

  const start = new Date(now);
  start.setMinutes(roundedMinutes);
  start.setSeconds(0);
  start.setMilliseconds(0);

  // If rounded to 60, add an hour
  if (roundedMinutes === 60) {
    start.setHours(start.getHours() + 1);
    start.setMinutes(0);
  }

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  return { start, end };
};

export const formatMeetingTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatMeetingDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const generateICSFile = (meeting: MeetingDetails): string => {
  const formatICalDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const now = new Date();
  const uid = `meeting-${Date.now()}@pulsework`;

  const attendeeLines = meeting.attendees
    .map(
      (a) =>
        `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;CN=${escapeText(
          a.name
        )}:mailto:${a.email}`
    )
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pulsework//Meeting Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(meeting.startDate)}`,
    `DTEND:${formatICalDate(meeting.endDate)}`,
    `SUMMARY:${escapeText(meeting.title)}`,
    `DESCRIPTION:${escapeText(meeting.description)}`,
    attendeeLines,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeText(meeting.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return ics;
};

export const downloadICSFile = (meeting: MeetingDetails): void => {
  const icsContent = generateICSFile(meeting);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${meeting.title
    .toLowerCase()
    .replace(/\s+/g, "-")}-${Date.now()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
