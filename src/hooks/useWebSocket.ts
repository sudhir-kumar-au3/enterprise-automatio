/**
 * React Hook for Scalable WebSocket Connection
 * Handles connection, reconnection, and real-time events
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts";
import { toast } from "sonner";

// Types
export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  status: "online" | "away" | "busy" | "dnd";
  currentView?: string;
  lastActivity: number;
}

export interface RealtimeNotification {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  action?: { label: string; url: string };
  timestamp: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
  room: string;
  timestamp: number;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onNotification?: (notification: RealtimeNotification) => void;
  onTaskUpdate?: (event: any) => void;
  onCommentUpdate?: (event: any) => void;
  onPresenceUpdate?: (presence: UserPresence[]) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  presence: UserPresence[];
  typingUsers: Map<string, TypingUser[]>;
  connect: () => void;
  disconnect: () => void;
  subscribe: (rooms: string | string[]) => void;
  unsubscribe: (rooms: string | string[]) => void;
  startTyping: (room: string) => void;
  stopTyping: (room: string) => void;
  setStatus: (status: "online" | "away" | "busy" | "dnd") => void;
  setViewing: (view: string, resourceId?: string) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5000";

// Reconnection config
const RECONNECT_CONFIG = {
  maxRetries: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.3,
};

export function useWebSocket(
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser[]>>(
    new Map()
  );

  // Typing timeout refs (auto-stop typing after 3s of inactivity)
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Calculate backoff delay with jitter
  const getReconnectDelay = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const baseDelay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(2, attempt),
      RECONNECT_CONFIG.maxDelay
    );
    const jitter =
      baseDelay * RECONNECT_CONFIG.jitterFactor * (Math.random() * 2 - 1);
    return Math.round(baseDelay + jitter);
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!user || socketRef.current?.connected) return;

    setIsConnecting(true);

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsConnecting(false);
      return;
    }

    const socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: false, // We handle reconnection manually for more control
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttemptRef.current = 0;
      console.log("[WS] Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("[WS] Disconnected:", reason);

      // Auto-reconnect for unexpected disconnections
      if (reason !== "io client disconnect") {
        scheduleReconnect();
      }
    });

    socket.on("connect_error", (error) => {
      setIsConnecting(false);
      console.error("[WS] Connection error:", error.message);
      scheduleReconnect();
    });

    // Presence updates
    socket.on("presence:update", (presenceList: UserPresence[]) => {
      setPresence(presenceList);
      options.onPresenceUpdate?.(presenceList);
    });

    // Typing indicators
    socket.on("user:typing", (data: TypingUser) => {
      setTypingUsers((prev) => {
        const updated = new Map(prev);
        const roomTypers = updated.get(data.room) || [];

        // Add or update typing user
        const existingIndex = roomTypers.findIndex(
          (t) => t.userId === data.userId
        );
        if (existingIndex >= 0) {
          roomTypers[existingIndex] = data;
        } else {
          roomTypers.push(data);
        }

        updated.set(data.room, roomTypers);
        return updated;
      });

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          const roomTypers = (updated.get(data.room) || []).filter(
            (t) => t.userId !== data.userId
          );
          if (roomTypers.length > 0) {
            updated.set(data.room, roomTypers);
          } else {
            updated.delete(data.room);
          }
          return updated;
        });
      }, 3000);
    });

    socket.on(
      "user:stopped-typing",
      (data: { userId: string; room: string }) => {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          const roomTypers = (updated.get(data.room) || []).filter(
            (t) => t.userId !== data.userId
          );
          if (roomTypers.length > 0) {
            updated.set(data.room, roomTypers);
          } else {
            updated.delete(data.room);
          }
          return updated;
        });
      }
    );

    // Task updates
    socket.on("task:update", (event: any) => {
      options.onTaskUpdate?.(event);
    });

    socket.on("task:assigned", (event: any) => {
      toast.info(`You've been assigned to: ${event.task?.title}`);
      options.onTaskUpdate?.(event);
    });

    // Comment updates
    socket.on("comment:added", (event: any) => {
      options.onCommentUpdate?.(event);
    });

    // Notifications
    socket.on("notification", (notification: RealtimeNotification) => {
      // Show toast notification
      const toastFn =
        {
          info: toast.info,
          success: toast.success,
          warning: toast.warning,
          error: toast.error,
        }[notification.type] || toast.info;

      toastFn(notification.title, {
        description: notification.message,
        action: notification.action
          ? {
              label: notification.action.label,
              onClick: () => {
                window.location.href = notification.action!.url;
              },
            }
          : undefined,
      });

      options.onNotification?.(notification);
    });

    // Server shutdown notice
    socket.on("server:shutdown", (data: { message: string }) => {
      toast.warning("Server restarting", {
        description: "You'll be reconnected automatically.",
      });
    });
  }, [user, options, getReconnectDelay]);

  // Schedule reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptRef.current >= RECONNECT_CONFIG.maxRetries) {
      toast.error("Connection lost", {
        description: "Unable to reconnect. Please refresh the page.",
      });
      return;
    }

    const delay = getReconnectDelay();
    reconnectAttemptRef.current++;

    console.log(
      `[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, getReconnectDelay]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Subscribe to rooms
  const subscribe = useCallback((rooms: string | string[]) => {
    socketRef.current?.emit("subscribe", rooms);
  }, []);

  // Unsubscribe from rooms
  const unsubscribe = useCallback((rooms: string | string[]) => {
    socketRef.current?.emit("unsubscribe", rooms);
  }, []);

  // Start typing indicator
  const startTyping = useCallback((room: string) => {
    socketRef.current?.emit("typing:start", { room });

    // Clear existing timeout for this room
    const existingTimeout = typingTimeoutsRef.current.get(room);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Auto-stop typing after 3 seconds of no activity
    const timeout = setTimeout(() => {
      stopTyping(room);
    }, 3000);
    typingTimeoutsRef.current.set(room, timeout);
  }, []);

  // Stop typing indicator
  const stopTyping = useCallback((room: string) => {
    socketRef.current?.emit("typing:stop", { room });

    const timeout = typingTimeoutsRef.current.get(room);
    if (timeout) {
      clearTimeout(timeout);
      typingTimeoutsRef.current.delete(room);
    }
  }, []);

  // Set user status
  const setStatus = useCallback(
    (status: "online" | "away" | "busy" | "dnd") => {
      socketRef.current?.emit("status:change", status);
    },
    []
  );

  // Set current view (for collaborative awareness)
  const setViewing = useCallback((view: string, resourceId?: string) => {
    socketRef.current?.emit("viewing", { view, resourceId });
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (options.autoConnect !== false && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, options.autoConnect, connect, disconnect]);

  // Handle visibility change (reconnect when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        user &&
        !isConnected &&
        !isConnecting
      ) {
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, isConnected, isConnecting, connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      socketRef.current?.emit("heartbeat");
    }, 30000);

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [isConnected]);

  return {
    isConnected,
    isConnecting,
    presence,
    typingUsers,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    startTyping,
    stopTyping,
    setStatus,
    setViewing,
  };
}

export default useWebSocket;
