import { useState, useEffect, useCallback } from "react";
import * as meetingsApi from "@/api/services/meetings";
import {
  Meeting,
  CreateMeetingData,
  UpdateMeetingData,
  MeetingFilters,
} from "@/api/services/meetings";
import { toast } from "sonner";

export function useMeetings(initialFilters?: MeetingFilters) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(
    async (filters?: MeetingFilters) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await meetingsApi.getMeetings(
          filters || initialFilters
        );
        if (response.success && response.data) {
          setMeetings(response.data);
        } else {
          setMeetings([]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch meetings");
        console.error("Error fetching meetings:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [initialFilters]
  );

  const fetchCalendarMeetings = useCallback(
    async (start: string, end: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await meetingsApi.getCalendarMeetings(start, end);
        if (response.success && response.data) {
          setMeetings(response.data);
          return response.data;
        }
        return [];
      } catch (err: any) {
        setError(err.message || "Failed to fetch calendar meetings");
        console.error("Error fetching calendar meetings:", err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const createMeeting = useCallback(async (data: CreateMeetingData) => {
    try {
      const response = await meetingsApi.createMeeting(data);
      if (response.success && response.data) {
        setMeetings((prev) =>
          [...prev, response.data!].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          )
        );
        toast.success("Meeting created successfully");
        return response.data;
      }
      throw new Error("Failed to create meeting");
    } catch (err: any) {
      toast.error(err.message || "Failed to create meeting");
      throw err;
    }
  }, []);

  const updateMeeting = useCallback(
    async (id: string, data: UpdateMeetingData) => {
      try {
        const response = await meetingsApi.updateMeeting(id, data);
        if (response.success && response.data) {
          setMeetings((prev) =>
            prev.map((m) => (m._id === id || m.id === id ? response.data! : m))
          );
          toast.success("Meeting updated successfully");
          return response.data;
        }
        throw new Error("Failed to update meeting");
      } catch (err: any) {
        toast.error(err.message || "Failed to update meeting");
        throw err;
      }
    },
    []
  );

  const deleteMeeting = useCallback(
    async (id: string, deleteRecurring?: boolean) => {
      try {
        const response = await meetingsApi.deleteMeeting(id, deleteRecurring);
        if (response.success) {
          if (deleteRecurring) {
            // Remove the meeting and all its recurring instances
            const meeting = meetings.find((m) => m._id === id || m.id === id);
            if (meeting) {
              setMeetings((prev) =>
                prev.filter(
                  (m) => m._id !== id && m.id !== id && m.parentMeetingId !== id
                )
              );
            }
          } else {
            setMeetings((prev) =>
              prev.filter((m) => m._id !== id && m.id !== id)
            );
          }
          toast.success("Meeting deleted successfully");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to delete meeting");
        throw err;
      }
    },
    [meetings]
  );

  const linkTasks = useCallback(
    async (meetingId: string, taskIds: string[]) => {
      try {
        const response = await meetingsApi.linkTasksToMeeting(
          meetingId,
          taskIds
        );
        if (response.success && response.data) {
          setMeetings((prev) =>
            prev.map((m) =>
              m._id === meetingId || m.id === meetingId ? response.data! : m
            )
          );
          toast.success("Tasks linked to meeting");
          return response.data;
        }
        throw new Error("Failed to link tasks");
      } catch (err: any) {
        toast.error(err.message || "Failed to link tasks");
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  return {
    meetings,
    isLoading,
    error,
    fetchMeetings,
    fetchCalendarMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    linkTasks,
    refetch: fetchMeetings,
  };
}

export type { Meeting, CreateMeetingData, UpdateMeetingData, MeetingFilters };
