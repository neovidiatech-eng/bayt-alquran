/**
 * Centralized Permission Constants
 * Format: resource:action
 */

export const PERMISSIONS_V2 = {
  DASHBOARD: {
    READ: "dashboard:read",
  },
  feedback:{
    READ: "feedback:read",
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

  // Teachers Management
  TEACHERS: {
    READ: "teachers:read",
    CREATE: "teachers:create",
    UPDATE: "teachers:update",
    DELETE: "teachers:delete",
    READ_MY_STUDENTS: "teachers:read_my_students",
  },

  // Students Management
  STUDENTS: {
    READ: "students:read",
    CREATE: "students:create",
    UPDATE: "students:update",
    DELETE: "students:delete",
  },

  // Staff Management
  STAFF: {
    READ: "staff:read",
    CREATE: "staff:create",
    UPDATE: "staff:update",
    DELETE: "staff:delete",
  },

  // Parents Management
  PARENTS: {
    READ: "parents:read",
    CREATE: "parents:create",
    UPDATE: "parents:update",
    DELETE: "parents:delete",
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
    READ_USER_SCHEDULES: "sessions:read_user_schedules",
  },

  // Homework Management
  HOMEWORK: {
    READ: "homework:read",
    CREATE: "homework:create",
    UPDATE: "homework:update",
    DELETE: "homework:delete",
    READ_STUDENT_HOMEWORK: "homework:read_student_homework",
  },

  // Daily Quran Recitation Management
  DAILY_QURAN_RECITATION: {
    READ: "daily_quran_recitation:read",
    CREATE: "daily_quran_recitation:create",
    UPDATE: "daily_quran_recitation:update",
    DELETE: "daily_quran_recitation:delete",
    READ_MY_RECITATIONS: "daily_quran_recitation:read_my_recitations",
    READ_TEACHER_RECITATIONS: "daily_quran_recitation:read_teacher_recitations",
  },

  // Exam Management
  EXAMS: {
    READ: "exams:read",
    CREATE: "exams:create",
    UPDATE: "exams:update",
    DELETE: "exams:delete",
    READ_STUDENT_EXAMS: "exams:read_student_exams",
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
    READ_MY_WITHDRAWALS: "withdrawals:read_my_withdrawals",
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
    READ_MY_TRANSACTIONS: "finances:read_my_transactions",
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

  // Violations & Penalties Management
  VIOLATIONS: {
    READ: "violations:read",
    CREATE: "violations:create",
    MANAGE: "violations:manage",
    READ_MY_VIOLATIONS: "violations:read_my_violations",
  },
  MODERATORS: {
    READ: "moderators:read",
    CREATE: "moderators:create",
    UPDATE: "moderators:update",
    DELETE: "moderators:delete",
    MANAGE: "moderators:manage",
    READ_STUDENTS: "moderators:read_students",
  },

  CURRENCIES: {
    READ: "currencies:read",
    CREATE: "currencies:create",
    UPDATE: "currencies:update",
    DELETE: "currencies:delete",
  },

};

