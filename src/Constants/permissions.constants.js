/**
 * Centralized Permission Constants
 * Format: resource:action
 */

export const PERMISSIONS_V2 = {
  DASHBOARD: {
    READ: "dashboard:read",
  },

  POLICIES: {
    READ: "policies:read",
    MANAGE: "policies:manage",
  },

  SETTINGS: {
    READ: "settings:read",
    UPDATE: "settings:update",
    VIEW_LATE_DISCOUNT: "settings:view_late_discount",
  },

  // User Management
  USERS: {
    READ: "users:read",
    CREATE: "users:create",
    UPDATE: "users:update",
    DELETE: "users:delete",
  },
  
  // Role Management
  ROLES: {
    READ: "roles:read",
    CREATE: "roles:create",
    UPDATE: "roles:update",
    DELETE: "roles:delete",
    ASSIGN: "roles:assign",
  },

  // Permission Management
  PERMISSIONS: {
    READ: "permissions:read",
    CREATE: "permissions:create",
    UPDATE: "permissions:update",
    DELETE: "permissions:delete",
  },

  // Course Management
  COURSES: {
    READ: "courses:read",
    CREATE: "courses:create",
    UPDATE: "courses:update",
    DELETE: "courses:delete",
  },

  // Lecture Management
  LECTURES: {
    READ: "lectures:read",
    CREATE: "lectures:create",
    UPDATE: "lectures:update",
    DELETE: "lectures:delete",
  },

  // Session/Schedule Management
  SESSIONS: {
    READ: "sessions:read",
    CREATE: "sessions:create",
    UPDATE: "sessions:update",
    DELETE: "sessions:delete",
    JOIN: "sessions:join",
    LEAVE: "sessions:leave",
  },

  // Homework Management
  HOMEWORK: {
    READ: "homework:read",
    CREATE: "homework:create",
    UPDATE: "homework:update",
    DELETE: "homework:delete",
  },

  // Exam Management
  EXAMS: {
    READ: "exams:read",
    CREATE: "exams:create",
    UPDATE: "exams:update",
    DELETE: "exams:delete",
  },

  // Profile Management
  PROFILE: {
    VIEW: "profile:view",
    UPDATE: "profile:update",
  },

  // Request Management
  REQUESTS: {
    READ: "requests:read",
    CREATE: "requests:create",
    UPDATE: "requests:update",
    DELETE: "requests:delete",
    HANDLE: "requests:handle",
    APPROVE: "requests:approve",
    REJECT: "requests:reject",
  },

  // Withdrawal Management
  WITHDRAWALS: {
    READ: "withdrawals:read",
    CREATE: "withdrawals:create",
    APPROVE: "withdrawals:approve",
  },

  // Weekly Report Management
  WEEKLY_REPORTS: {
    READ: "weekly_reports:read",
    CREATE: "weekly_reports:create",
    UPDATE: "weekly_reports:update",
    DELETE: "weekly_reports:delete",
  },

  // Subscription Management
  SUBSCRIPTIONS: {
    READ: "subscriptions:read",
    MANAGE: "subscriptions:manage",
  },

  // Support Management
  SUPPORT: {
    READ: "support:read",
    MANAGE: "support:manage",
  },

  // Calendar Management
  CALENDAR: {
    READ: "calendar:read",
  },

  // Plan Management
  PLANS: {
    READ: "plans:read",
    CREATE: "plans:create",
    UPDATE: "plans:update",
    DELETE: "plans:delete",
  },

  // Chat Management
  CHAT: {
    READ: "chat:read",
    CREATE: "chat:create",
  },

  // Finance Management
  FINANCES: {
    READ: "finances:read",
    MANAGE: "finances:manage",
  },

  // Rank Management
  RANKS: {
    READ: "ranks:read",
    CREATE: "ranks:create",
    UPDATE: "ranks:update",
    DELETE: "ranks:delete",
  },

  // Subject Management
  SUBJECTS: {
    READ: "subjects:read",
    CREATE: "subjects:create",
    UPDATE: "subjects:update",
    DELETE: "subjects:delete",
  },
};
