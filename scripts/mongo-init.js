/**
 * MongoDB Index Migration Script
 * Ensures optimal indexes exist for common query patterns
 * Run this script during deployment or as a one-time migration
 */

db = db.getSiblingDB("team_hub");

print("Starting index optimization for Team Collaboration Hub...");

// ==========================================
// Tasks Collection Indexes
// ==========================================
print("\n[1/4] Optimizing Tasks collection indexes...");

// Compound index for task filtering (most common query pattern)
db.tasks.createIndex(
  { status: 1, priority: 1, createdAt: -1 },
  { name: "idx_tasks_status_priority_created", background: true }
);

// Index for assignee queries with status filter
db.tasks.createIndex(
  { assigneeId: 1, status: 1, dueDate: 1 },
  { name: "idx_tasks_assignee_status_due", background: true }
);

// Index for creator queries
db.tasks.createIndex(
  { creatorId: 1, createdAt: -1 },
  { name: "idx_tasks_creator_created", background: true }
);

// Index for due date queries (overdue, due soon)
db.tasks.createIndex(
  { dueDate: 1, status: 1 },
  { name: "idx_tasks_duedate_status", background: true }
);

// Text index for search functionality
db.tasks.createIndex(
  { title: "text", description: "text", tags: "text" },
  {
    name: "idx_tasks_text_search",
    weights: { title: 10, tags: 5, description: 1 },
  }
);

// Index for context-based queries
db.tasks.createIndex(
  { contextType: 1, contextId: 1, status: 1 },
  { name: "idx_tasks_context", background: true }
);

// Index for dependency lookups
db.tasks.createIndex(
  { dependencies: 1 },
  { name: "idx_tasks_dependencies", background: true, sparse: true }
);

print("  ✓ Tasks indexes created");

// ==========================================
// Team Members Collection Indexes
// ==========================================
print("\n[2/4] Optimizing TeamMembers collection indexes...");

// Unique email index (likely already exists)
db.teammembers.createIndex(
  { email: 1 },
  { name: "idx_members_email", unique: true, background: true }
);

// Index for role-based queries
db.teammembers.createIndex(
  { role: 1, accessLevel: 1 },
  { name: "idx_members_role_access", background: true }
);

// Index for online status queries
db.teammembers.createIndex(
  { isOnline: 1, lastSeen: -1 },
  { name: "idx_members_online_lastseen", background: true }
);

print("  ✓ TeamMembers indexes created");

// ==========================================
// Comments Collection Indexes
// ==========================================
print("\n[3/4] Optimizing Comments collection indexes...");

// Index for context-based comment retrieval
db.comments.createIndex(
  { contextType: 1, contextId: 1, timestamp: -1 },
  { name: "idx_comments_context_time", background: true }
);

// Index for author queries
db.comments.createIndex(
  { authorId: 1, timestamp: -1 },
  { name: "idx_comments_author_time", background: true }
);

// Index for unresolved comments
db.comments.createIndex(
  { isResolved: 1, contextType: 1, timestamp: -1 },
  { name: "idx_comments_resolved_context", background: true }
);

// Index for mentions (for notifications)
db.comments.createIndex(
  { mentions: 1, timestamp: -1 },
  { name: "idx_comments_mentions", background: true, sparse: true }
);

print("  ✓ Comments indexes created");

// ==========================================
// Activities Collection Indexes
// ==========================================
print("\n[4/4] Optimizing Activities collection indexes...");

// Index for user activity timeline
db.activities.createIndex(
  { userId: 1, timestamp: -1 },
  { name: "idx_activities_user_time", background: true }
);

// Index for context-based activity feed
db.activities.createIndex(
  { contextType: 1, contextId: 1, timestamp: -1 },
  { name: "idx_activities_context_time", background: true }
);

// Index for activity type queries
db.activities.createIndex(
  { type: 1, timestamp: -1 },
  { name: "idx_activities_type_time", background: true }
);

// TTL index - auto-delete activities older than 1 year
db.activities.createIndex(
  { timestamp: 1 },
  {
    name: "idx_activities_ttl",
    expireAfterSeconds: 365 * 24 * 60 * 60,
    background: true,
  }
);

print("  ✓ Activities indexes created");

// ==========================================
// Index Statistics
// ==========================================
print("\n========================================");
print("Index Optimization Complete!");
print("========================================\n");

// Print index stats for each collection
["tasks", "teammembers", "comments", "activities", "audit_logs"].forEach(
  function (collName) {
    var coll = db.getCollection(collName);
    if (coll.exists()) {
      var indexes = coll.getIndexes();
      print(collName + ": " + indexes.length + " indexes");
      indexes.forEach(function (idx) {
        print("  - " + idx.name);
      });
    }
  }
);

print("\nDone!");
