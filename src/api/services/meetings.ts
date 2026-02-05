import { apiClient, ApiResponse } from "../client";

export type MeetingType =
  | "team-review"
  | "sprint-planning"
  | "standup"
  | "one-on-one"
  | "retrospective"
  | "custom";
export type MeetingStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";
export type RecurrencePattern =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "none";

export interface Meeting {
  _id: string;
  id?: string;
  organizationId: string;
  title: string;
  description?: string;
  meetingType: MeetingType;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  platform?: "google" | "teams" | "zoom" | "other";
  status: MeetingStatus;
  organizerId: string;
  attendeeIds: string[];
  isRecurring: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate?: string;
  parentMeetingId?: string;
  linkedTaskIds: string[];
  reminderMinutes: number[];
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  meetingType?: MeetingType;
  startTime: string;
  endTime: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  platform?: "google" | "teams" | "zoom" | "other";
  attendeeIds?: string[];
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
  linkedTaskIds?: string[];
  reminderMinutes?: number[];
  color?: string;
  notes?: string;
}

export interface UpdateMeetingData extends Partial<CreateMeetingData> {
  status?: MeetingStatus;
}

export interface MeetingFilters {
  startDate?: string;
  endDate?: string;
  status?: MeetingStatus;
  attendeeId?: string;
}

// Get all meetings
export const getMeetings = async (
  filters?: MeetingFilters
): Promise<ApiResponse<Meeting[]>> => {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.attendeeId) params.append("attendeeId", filters.attendeeId);

  const queryString = params.toString();
  const url = queryString ? `/meetings?${queryString}` : "/meetings";

  return apiClient.get<Meeting[]>(url);
};

// Get meetings for calendar view
export const getCalendarMeetings = async (
  start: string,
  end: string
): Promise<ApiResponse<Meeting[]>> => {
  return apiClient.get<Meeting[]>(
    `/meetings/calendar?start=${encodeURIComponent(
      start
    )}&end=${encodeURIComponent(end)}`
  );
};

// Get single meeting
export const getMeeting = async (id: string): Promise<ApiResponse<Meeting>> => {
  return apiClient.get<Meeting>(`/meetings/${id}`);
};

// Create meeting
export const createMeeting = async (
  data: CreateMeetingData
): Promise<ApiResponse<Meeting>> => {
  return apiClient.post<Meeting>("/meetings", data);
};

// Update meeting
export const updateMeeting = async (
  id: string,
  data: UpdateMeetingData
): Promise<ApiResponse<Meeting>> => {
  return apiClient.put<Meeting>(`/meetings/${id}`, data);
};

// Delete meeting
export const deleteMeeting = async (
  id: string,
  deleteRecurring?: boolean
): Promise<ApiResponse<{ message: string }>> => {
  const url = deleteRecurring
    ? `/meetings/${id}?deleteRecurring=true`
    : `/meetings/${id}`;
  return apiClient.delete<{ message: string }>(url);
};

// Link tasks to meeting
export const linkTasksToMeeting = async (
  meetingId: string,
  taskIds: string[]
): Promise<ApiResponse<Meeting>> => {
  return apiClient.post<Meeting>(`/meetings/${meetingId}/tasks`, { taskIds });
};
