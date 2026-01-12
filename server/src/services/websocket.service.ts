/**
 * Scalable WebSocket Service
 *
 * Architecture:
 * - Uses Socket.IO with Redis Adapter for horizontal scaling
 * - Redis Pub/Sub enables cross-instance communication
 * - Supports thousands of concurrent connections per instance
 * - Stateless design - any instance can handle any user
 *
 * Scaling Strategy:
 * ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
 * │  Server 1   │     │  Server 2   │     │  Server N   │
 * │  Socket.IO  │     │  Socket.IO  │     │  Socket.IO  │
 * └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
 *        │                   │                   │
 *        └───────────────────┼───────────────────┘
 *                            │
 *                    ┌───────┴───────┐
 *                    │  Redis Cluster │
 *                    │   (Pub/Sub)    │
 *                    └───────────────┘
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, RedisClientType } from "redis";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import config from "../config";
import logger from "../utils/logger";

// Types
interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  serverId: string;
  status: "online" | "away" | "busy" | "dnd";
  currentView?: string;
  lastActivity: number;
  connectedAt: number;
}

interface BroadcastEvent {
  type: "task" | "comment" | "member" | "notification" | "presence" | "system";
  action: "created" | "updated" | "deleted" | "typing" | "viewing" | "assigned";
  payload: Record<string, any>;
  userId: string;
  timestamp: number;
  targetUsers?: string[];
  targetRooms?: string[];
}

interface RoomInfo {
  name: string;
  type: "task" | "project" | "team" | "user";
  memberCount: number;
}

// Configuration
const WS_CONFIG = {
  // Connection limits per instance
  maxConnectionsPerInstance: 10000,

  // Heartbeat settings
  pingTimeout: 60000,
  pingInterval: 25000,

  // Presence sync interval (ms)
  presenceSyncInterval: 30000,

  // Stale connection cleanup (ms)
  staleConnectionTimeout: 120000,

  // Redis key prefixes
  redisPrefix: "ws:",
  presenceKey: "ws:presence",
  metricsKey: "ws:metrics",
};

// Generate unique server ID for this instance
const SERVER_ID = `server-${process.pid}-${Date.now().toString(36)}`;

class ScalableWebSocketService {
  private io: SocketIOServer | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;
  private presenceClient: RedisClientType | null = null;

  // Local tracking (instance-specific)
  private localConnections: Map<string, Socket> = new Map();
  private connectionCount: number = 0;

  // Intervals for background tasks
  private presenceSyncInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server with Redis adapter
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    try {
      // Create Redis clients for pub/sub
      this.pubClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password || undefined,
      });

      this.subClient = this.pubClient.duplicate();
      this.presenceClient = this.pubClient.duplicate();

      // Connect all Redis clients
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
        this.presenceClient.connect(),
      ]);

      logger.info("Redis clients connected for WebSocket scaling");

      // Initialize Socket.IO with Redis adapter
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: config.cors.origin,
          methods: ["GET", "POST"],
          credentials: true,
        },
        pingTimeout: WS_CONFIG.pingTimeout,
        pingInterval: WS_CONFIG.pingInterval,
        // Optimize for scale
        transports: ["websocket", "polling"],
        allowUpgrades: true,
        perMessageDeflate: {
          threshold: 1024,
        },
        // Connection state recovery (Socket.IO 4.6+)
        connectionStateRecovery: {
          maxDisconnectionDuration: 2 * 60 * 1000,
          skipMiddlewares: true,
        },
      });

      // Attach Redis adapter for horizontal scaling
      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      // Setup authentication middleware
      this.setupAuthMiddleware();

      // Setup connection handlers
      this.setupConnectionHandlers();

      // Start background tasks
      this.startBackgroundTasks();

      // Register this server instance
      await this.registerServer();

      logger.info(`WebSocket server initialized (Instance: ${SERVER_ID})`);
    } catch (error) {
      logger.error("Failed to initialize WebSocket server", error);
      throw error;
    }
  }

  /**
   * Authentication middleware
   */
  private setupAuthMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        // Check connection limit
        if (this.connectionCount >= WS_CONFIG.maxConnectionsPerInstance) {
          return next(new Error("Server at capacity, try another instance"));
        }

        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace("Bearer ", "");

        if (!token) {
          return next(new Error("Authentication required"));
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;

        // Attach user data to socket
        socket.data.user = {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name || decoded.email.split("@")[0],
          role: decoded.role,
          accessLevel: decoded.accessLevel,
        };

        next();
      } catch (error) {
        logger.warn("WebSocket auth failed", {
          error: (error as Error).message,
        });
        next(new Error("Invalid or expired token"));
      }
    });
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", async (socket) => {
      const user = socket.data.user;

      this.connectionCount++;
      this.localConnections.set(socket.id, socket);

      logger.info(
        `User connected: ${user.email} (${socket.id}) on ${SERVER_ID}`
      );

      // Store presence in Redis (shared across all instances)
      await this.setUserPresence(user.id, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        socketId: socket.id,
        serverId: SERVER_ID,
        status: "online",
        lastActivity: Date.now(),
        connectedAt: Date.now(),
      });

      // Join user's personal room (for direct messages)
      socket.join(`user:${user.id}`);

      // Broadcast presence update to all instances
      await this.broadcastPresenceUpdate();

      // Setup socket event handlers
      this.setupSocketEvents(socket);

      // Handle disconnection
      socket.on("disconnect", async (reason) => {
        this.connectionCount--;
        this.localConnections.delete(socket.id);

        logger.info(`User disconnected: ${user.email} (${reason})`);

        // Remove from Redis presence
        await this.removeUserPresence(user.id);
        await this.broadcastPresenceUpdate();
      });
    });
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEvents(socket: Socket): void {
    const user = socket.data.user;

    // Subscribe to rooms (tasks, projects, etc.)
    socket.on("subscribe", async (rooms: string | string[]) => {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];

      for (const room of roomList) {
        // Validate room access (implement your authorization logic)
        if (await this.canAccessRoom(user, room)) {
          socket.join(room);
          logger.debug(`${user.email} subscribed to ${room}`);
        }
      }
    });

    socket.on("unsubscribe", (rooms: string | string[]) => {
      const roomList = Array.isArray(rooms) ? rooms : [rooms];
      roomList.forEach((room) => socket.leave(room));
    });

    // Typing indicators
    socket.on("typing:start", async (data: { room: string }) => {
      socket.to(data.room).emit("user:typing", {
        userId: user.id,
        userName: user.name,
        room: data.room,
        timestamp: Date.now(),
      });
    });

    socket.on("typing:stop", (data: { room: string }) => {
      socket.to(data.room).emit("user:stopped-typing", {
        userId: user.id,
        room: data.room,
      });
    });

    // View tracking (collaborative awareness)
    socket.on(
      "viewing",
      async (data: { view: string; resourceId?: string }) => {
        await this.updateUserPresence(user.id, {
          currentView: data.resourceId
            ? `${data.view}:${data.resourceId}`
            : data.view,
          lastActivity: Date.now(),
        });

        // Notify others viewing the same resource
        if (data.resourceId) {
          socket.to(`${data.view}:${data.resourceId}`).emit("user:viewing", {
            userId: user.id,
            userName: user.name,
            view: data.view,
            resourceId: data.resourceId,
          });
        }
      }
    );

    // Status change
    socket.on(
      "status:change",
      async (status: "online" | "away" | "busy" | "dnd") => {
        await this.updateUserPresence(user.id, {
          status,
          lastActivity: Date.now(),
        });
        await this.broadcastPresenceUpdate();
      }
    );

    // Cursor position (for real-time collaborative editing)
    socket.on(
      "cursor:move",
      (data: { room: string; position: { x: number; y: number } }) => {
        socket.to(data.room).volatile.emit("cursor:update", {
          userId: user.id,
          userName: user.name,
          position: data.position,
        });
      }
    );

    // Heartbeat for activity tracking
    socket.on("heartbeat", async () => {
      await this.updateUserPresence(user.id, { lastActivity: Date.now() });
    });
  }

  /**
   * Redis Presence Management
   */
  private async setUserPresence(
    userId: string,
    presence: UserPresence
  ): Promise<void> {
    if (!this.presenceClient) return;

    const key = `${WS_CONFIG.presenceKey}:${userId}`;
    await this.presenceClient.hSet(key, {
      userId: presence.userId,
      userName: presence.userName,
      userEmail: presence.userEmail,
      socketId: presence.socketId,
      serverId: presence.serverId,
      status: presence.status,
      currentView: presence.currentView || "",
      lastActivity: presence.lastActivity.toString(),
      connectedAt: presence.connectedAt.toString(),
    });

    // Set expiry for automatic cleanup
    await this.presenceClient.expire(
      key,
      WS_CONFIG.staleConnectionTimeout / 1000
    );
  }

  private async updateUserPresence(
    userId: string,
    updates: Partial<UserPresence>
  ): Promise<void> {
    if (!this.presenceClient) return;

    const key = `${WS_CONFIG.presenceKey}:${userId}`;
    const updateData: Record<string, string> = {};

    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) {
        updateData[k] = typeof v === "number" ? v.toString() : String(v);
      }
    });

    if (Object.keys(updateData).length > 0) {
      await this.presenceClient.hSet(key, updateData);
      await this.presenceClient.expire(
        key,
        WS_CONFIG.staleConnectionTimeout / 1000
      );
    }
  }

  private async removeUserPresence(userId: string): Promise<void> {
    if (!this.presenceClient) return;
    await this.presenceClient.del(`${WS_CONFIG.presenceKey}:${userId}`);
  }

  private async getAllPresence(): Promise<UserPresence[]> {
    if (!this.presenceClient) return [];

    const keys = await this.presenceClient.keys(`${WS_CONFIG.presenceKey}:*`);
    if (keys.length === 0) return [];

    const presenceList: UserPresence[] = [];

    for (const key of keys) {
      const data = await this.presenceClient.hGetAll(key);
      if (data && data.userId) {
        presenceList.push({
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          socketId: data.socketId,
          serverId: data.serverId,
          status: data.status as any,
          currentView: data.currentView || undefined,
          lastActivity: parseInt(data.lastActivity, 10),
          connectedAt: parseInt(data.connectedAt, 10),
        });
      }
    }

    return presenceList;
  }

  /**
   * Broadcast Methods (work across all server instances)
   */
  async broadcastPresenceUpdate(): Promise<void> {
    if (!this.io) return;
    const presence = await this.getAllPresence();
    this.io.emit("presence:update", presence);
  }

  async broadcastToRoom(room: string, event: string, data: any): Promise<void> {
    if (!this.io) return;
    this.io.to(room).emit(event, {
      ...data,
      timestamp: Date.now(),
      serverId: SERVER_ID,
    });
  }

  async broadcastToUser(
    userId: string,
    event: string,
    data: any
  ): Promise<void> {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async broadcastToAll(event: string, data: any): Promise<void> {
    if (!this.io) return;
    this.io.emit(event, {
      ...data,
      timestamp: Date.now(),
      serverId: SERVER_ID,
    });
  }

  /**
   * High-level broadcast methods for app events
   */
  async notifyTaskUpdate(
    taskId: string,
    action: string,
    task: any,
    actorId: string
  ): Promise<void> {
    const event: BroadcastEvent = {
      type: "task",
      action: action as any,
      payload: { taskId, task },
      userId: actorId,
      timestamp: Date.now(),
    };

    // Broadcast to task room
    await this.broadcastToRoom(`task:${taskId}`, "task:update", event);

    // Also broadcast to assignee if exists
    if (task.assigneeId && task.assigneeId !== actorId) {
      await this.broadcastToUser(task.assigneeId, "notification", {
        title: `Task ${action}`,
        message: `Task "${task.title}" was ${action}`,
        type: "info",
        action: { label: "View Task", url: `/tasks/${taskId}` },
      });
    }
  }

  async notifyCommentAdded(comment: any, actorId: string): Promise<void> {
    const room = `${comment.contextType}:${comment.contextId}`;

    await this.broadcastToRoom(room, "comment:added", {
      type: "comment",
      action: "created",
      payload: comment,
      userId: actorId,
      timestamp: Date.now(),
    });

    // Notify mentioned users
    if (comment.mentions?.length) {
      for (const mentionedUserId of comment.mentions) {
        if (mentionedUserId !== actorId) {
          await this.broadcastToUser(mentionedUserId, "notification", {
            title: "You were mentioned",
            message: `You were mentioned in a comment`,
            type: "info",
          });
        }
      }
    }
  }

  async notifyAssignment(
    taskId: string,
    assigneeId: string,
    task: any,
    actorId: string
  ): Promise<void> {
    await this.broadcastToUser(assigneeId, "notification", {
      title: "Task Assigned",
      message: `You have been assigned to "${task.title}"`,
      type: "success",
      action: { label: "View Task", url: `/tasks/${taskId}` },
    });

    await this.broadcastToUser(assigneeId, "task:assigned", {
      taskId,
      task,
      assignedBy: actorId,
    });
  }

  /**
   * Room access control
   */
  private async canAccessRoom(user: any, room: string): Promise<boolean> {
    // Implement your authorization logic here
    // For now, allow all authenticated users
    // In production, check if user has access to the resource

    const [type, id] = room.split(":");

    switch (type) {
      case "task":
        // Check if user can access this task
        return true; // Implement actual check
      case "project":
        // Check project membership
        return true;
      case "team":
        // Check team membership
        return true;
      case "user":
        // Only allow access to own user room
        return id === user.id;
      default:
        return true;
    }
  }

  /**
   * Background tasks
   */
  private startBackgroundTasks(): void {
    // Periodic presence sync
    this.presenceSyncInterval = setInterval(async () => {
      await this.broadcastPresenceUpdate();
    }, WS_CONFIG.presenceSyncInterval);

    // Cleanup stale connections
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStaleConnections();
    }, WS_CONFIG.staleConnectionTimeout / 2);
  }

  private async cleanupStaleConnections(): Promise<void> {
    if (!this.presenceClient) return;

    const presence = await this.getAllPresence();
    const now = Date.now();

    for (const p of presence) {
      if (now - p.lastActivity > WS_CONFIG.staleConnectionTimeout) {
        logger.info(`Cleaning up stale connection for ${p.userEmail}`);
        await this.removeUserPresence(p.userId);
      }
    }
  }

  private async registerServer(): Promise<void> {
    if (!this.presenceClient) return;

    const serverKey = `${WS_CONFIG.redisPrefix}servers:${SERVER_ID}`;
    await this.presenceClient.hSet(serverKey, {
      serverId: SERVER_ID,
      startedAt: Date.now().toString(),
      connections: "0",
      pid: process.pid.toString(),
    });
    await this.presenceClient.expire(serverKey, 60);

    // Refresh registration periodically
    setInterval(async () => {
      if (this.presenceClient) {
        await this.presenceClient.hSet(serverKey, {
          connections: this.connectionCount.toString(),
          lastHeartbeat: Date.now().toString(),
        });
        await this.presenceClient.expire(serverKey, 60);
      }
    }, 30000);
  }

  /**
   * Metrics and monitoring
   */
  getMetrics(): {
    serverId: string;
    connections: number;
    localConnections: number;
    uptime: number;
  } {
    return {
      serverId: SERVER_ID,
      connections: this.connectionCount,
      localConnections: this.localConnections.size,
      uptime: process.uptime(),
    };
  }

  async getGlobalMetrics(): Promise<{
    totalConnections: number;
    serverCount: number;
    servers: Array<{ serverId: string; connections: number }>;
  }> {
    if (!this.presenceClient) {
      return { totalConnections: 0, serverCount: 0, servers: [] };
    }

    const serverKeys = await this.presenceClient.keys(
      `${WS_CONFIG.redisPrefix}servers:*`
    );
    const servers: Array<{ serverId: string; connections: number }> = [];
    let totalConnections = 0;

    for (const key of serverKeys) {
      const data = await this.presenceClient.hGetAll(key);
      if (data.serverId) {
        const connections = parseInt(data.connections || "0", 10);
        servers.push({ serverId: data.serverId, connections });
        totalConnections += connections;
      }
    }

    return {
      totalConnections,
      serverCount: servers.length,
      servers,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down WebSocket service...");

    // Clear intervals
    if (this.presenceSyncInterval) clearInterval(this.presenceSyncInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);

    // Disconnect all local sockets gracefully
    for (const [, socket] of this.localConnections) {
      socket.emit("server:shutdown", { message: "Server is restarting" });
      socket.disconnect(true);
    }

    // Deregister server
    if (this.presenceClient) {
      await this.presenceClient.del(
        `${WS_CONFIG.redisPrefix}servers:${SERVER_ID}`
      );
    }

    // Close Socket.IO
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io!.close(() => resolve());
      });
    }

    // Close Redis connections
    await Promise.all([
      this.pubClient?.quit(),
      this.subClient?.quit(),
      this.presenceClient?.quit(),
    ]);

    logger.info("WebSocket service shut down complete");
  }
}

// Export singleton instance
export const wsService = new ScalableWebSocketService();
export default wsService;
