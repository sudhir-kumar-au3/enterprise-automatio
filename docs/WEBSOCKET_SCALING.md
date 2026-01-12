# WebSocket Scaling Architecture Guide

## Overview

This document outlines the scalable real-time architecture implemented for the Team Collaboration Hub.

## Architecture Comparison

| Solution | Max Connections | Latency | Cost | Complexity | Best For |
|----------|----------------|---------|------|------------|----------|
| **Socket.IO + Redis (Implemented)** | 100K+ | <50ms | Low ($50-200/mo) | Medium | Self-hosted, full control |
| AWS API Gateway WebSocket | 500K+ | <100ms | Pay-per-message | Medium | AWS-native apps |
| Pusher/Ably (Managed) | Unlimited | <100ms | $50-500/mo | Low | Quick MVP, small teams |
| Kafka + Custom WS | Millions | <20ms | High | Very High | Enterprise, event sourcing |

## Current Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                             │
│                    (Sticky Sessions OR)                          │
│                 (WebSocket-aware routing)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ Server 1  │  │ Server 2  │  │ Server N  │
│ Socket.IO │  │ Socket.IO │  │ Socket.IO │
│ (10K conn)│  │ (10K conn)│  │ (10K conn)│
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   Redis Cluster       │
         │   ┌─────┐ ┌─────┐    │
         │   │Pub  │ │Sub  │    │
         │   └─────┘ └─────┘    │
         │   ┌─────────────┐    │
         │   │  Presence   │    │
         │   │   Store     │    │
         │   └─────────────┘    │
         └───────────────────────┘
```

## Scaling Benchmarks

### Per Server Instance (4 vCPU, 8GB RAM)
- **Concurrent connections**: 10,000-15,000
- **Messages/second**: 50,000+
- **Memory per connection**: ~10KB
- **CPU usage at capacity**: 60-70%

### Horizontal Scaling
| Instances | Connections | Messages/sec | Est. Monthly Cost (AWS) |
|-----------|-------------|--------------|-------------------------|
| 2 | 20K | 100K | $150 |
| 5 | 50K | 250K | $350 |
| 10 | 100K | 500K | $700 |
| 20 | 200K | 1M | $1,400 |

## Key Features Implemented

### 1. **Redis Adapter for Cross-Instance Communication**
```typescript
// Messages broadcast on Server 1 reach users on Server 2, 3, N
this.io.adapter(createAdapter(this.pubClient, this.subClient));
```

### 2. **Shared Presence Store**
```typescript
// User presence stored in Redis, accessible by all instances
await this.presenceClient.hSet(`ws:presence:${oderId}`, presence);
```

### 3. **Automatic Reconnection with Exponential Backoff**
```typescript
// Client reconnects with jittered backoff: 1s, 2s, 4s, 8s... up to 30s
const delay = baseDelay * Math.pow(2, attempt) + jitter;
```

### 4. **Connection State Recovery (Socket.IO 4.6+)**
```typescript
// Recovers missed events after brief disconnection
connectionStateRecovery: {
  maxDisconnectionDuration: 2 * 60 * 1000,
}
```

### 5. **Graceful Shutdown**
```typescript
// Notifies clients before restart, allows reconnection to other instances
socket.emit("server:shutdown", { message: "Server restarting" });
```

## Load Balancer Configuration

### NGINX (Recommended)
```nginx
upstream websocket_servers {
    ip_hash;  # Sticky sessions for WebSocket
    server server1:5000;
    server server2:5000;
    server server3:5000;
}

server {
    location /socket.io/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;  # 24 hours
    }
}
```

### AWS ALB
- Enable **sticky sessions** (application-based)
- Configure WebSocket idle timeout: 3600 seconds
- Health check path: `/api/v1/health/live`

## Redis Configuration

### Single Instance (Development)
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Redis Cluster (Production)
```yaml
# Minimum 6 nodes for Redis Cluster (3 masters + 3 replicas)
redis-cluster:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
```

### AWS ElastiCache
- **Node type**: cache.r6g.large (recommended)
- **Cluster mode**: Enabled
- **Replicas**: 2 per shard
- **Estimated cost**: $200-400/month

## Monitoring & Observability

### Metrics Exposed
```typescript
// GET /api/v1/ws/metrics
{
  "serverId": "server-12345-abc",
  "connections": 8542,
  "totalConnections": 25000,  // Across all instances
  "serverCount": 3,
  "uptime": 86400
}
```

### Key Metrics to Monitor
1. **Connection count per instance**
2. **Message throughput (msg/sec)**
3. **Redis pub/sub latency**
4. **Reconnection rate**
5. **Memory usage per instance**

### Grafana Dashboard Queries
```promql
# Total WebSocket connections
sum(ws_connections_total)

# Messages per second
rate(ws_messages_total[5m])

# Connection errors
rate(ws_connection_errors_total[5m])
```

## Event Types

| Event | Direction | Description |
|-------|-----------|-------------|
| `presence:update` | Server → Client | User online/offline status |
| `task:update` | Server → Client | Task created/updated/deleted |
| `task:assigned` | Server → Client | Task assigned to user |
| `comment:added` | Server → Client | New comment on subscribed resource |
| `user:typing` | Server → Client | User started typing |
| `user:stopped-typing` | Server → Client | User stopped typing |
| `notification` | Server → Client | Push notification |
| `subscribe` | Client → Server | Subscribe to room(s) |
| `unsubscribe` | Client → Server | Unsubscribe from room(s) |
| `typing:start` | Client → Server | Start typing indicator |
| `typing:stop` | Client → Server | Stop typing indicator |
| `status:change` | Client → Server | Change user status |
| `heartbeat` | Client → Server | Keep connection alive |

## Room Naming Convention

```
user:{userId}        # Personal notifications
task:{taskId}        # Task updates & comments
project:{projectId}  # Project-wide updates
team:{teamId}        # Team announcements
```

## Security Considerations

1. **JWT Authentication**: All connections require valid JWT
2. **Room Authorization**: Server validates room access before joining
3. **Rate Limiting**: Max 100 messages/minute per connection
4. **Message Size**: Max 1MB per message
5. **Connection Limits**: 10,000 per server instance

## Alternative: AWS API Gateway WebSocket

For serverless/AWS-native deployments:

```typescript
// Lambda handler for WebSocket
export const handler = async (event) => {
  const { requestContext, body } = event;
  const { connectionId, routeKey } = requestContext;
  
  switch (routeKey) {
    case '$connect':
      // Store connectionId in DynamoDB
      break;
    case '$disconnect':
      // Remove from DynamoDB
      break;
    case 'sendMessage':
      // Broadcast via API Gateway Management API
      break;
  }
};
```

**Pros**: Serverless, auto-scaling, pay-per-use
**Cons**: Higher latency, complex state management, vendor lock-in

## Migration Path

### Phase 1: Current (Socket.IO + Redis)
- 2-3 server instances
- Single Redis instance
- ~20K concurrent users

### Phase 2: Growth (Socket.IO + Redis Cluster)
- 5-10 server instances
- Redis Cluster (6 nodes)
- ~100K concurrent users

### Phase 3: Scale (Hybrid)
- Socket.IO for real-time
- Kafka for event sourcing
- Redis for presence
- ~500K+ concurrent users

## Troubleshooting

### High Memory Usage
```bash
# Check per-connection memory
redis-cli info memory
# Reduce presence sync frequency
# Implement message batching
```

### Connection Drops
```bash
# Check Redis connectivity
redis-cli ping
# Verify load balancer timeout settings
# Check for network issues between instances
```

### Message Delays
```bash
# Check Redis pub/sub lag
redis-cli pubsub numsub ws:*
# Monitor network latency between servers
# Consider message compression
```
