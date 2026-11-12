import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedNotifications() {
  console.log("Start seeding notifications...");

  // Delete all notifications for a clean seed
  await prisma.notification.deleteMany({});

  const notificationsData = [
    {
      userId: "admin",
      title: "New Student Registered",
      message: "A new student has registered: John Doe (john@example.com).",
      type: "new_student",
      isRead: false,
    },
    {
      userId: "admin",
      title: "New Student Signed Up (Google)",
      message: "A new student signed up via Google: Alice Smith (alice@example.com).",
      type: "new_student",
      isRead: false,
    },
    {
      userId: "admin",
      title: "New Teacher Created",
      message: "A new teacher account has been created: Mr. Robert (robert@example.com).",
      type: "new_teacher",
      isRead: false,
    },
    {
      userId: "admin",
      title: "Session Scheduled",
      message: "A new session 'Quran Memorization' has been scheduled for student: John Doe with teacher: Mr. Robert.",
      type: "session_created",
      isRead: false,
    },
    {
      userId: "admin",
      title: "Session Rescheduled/Updated",
      message: "Session 'Quran Memorization' has been updated/rescheduled for student: John Doe with teacher: Mr. Robert.",
      type: "session_updated",
      isRead: false,
    },
    {
      userId: "admin",
      title: "Session Cancelled",
      message: "Session 'Arabic Basics' has been cancelled/deleted for student: John Doe.",
      type: "session_cancelled",
      isRead: true,
    },
    {
      userId: "admin",
      title: "Session Missed",
      message: "The session 'Tajweed 101' between student: John Doe and teacher: Mr. Robert was missed.",
      type: "session_missed",
      isRead: false,
    },
    {
      userId: "admin",
      title: "Teacher Joined Late",
      message: "Teacher Mr. Robert joined the session late by 12 minutes.",
      type: "teacher_late",
      isRead: false,
    },
    {
      userId: "admin",
      title: "New Session Request",
      message: "A new session request (reschedule) has been submitted by student: John Doe.",
      type: "session_request_created",
      isRead: false,
    },
    {
      userId: "admin",
      title: "Session Request Approved",
      message: "The session request (cancel) by student: John Doe has been approved.",
      type: "session_request_approved",
      isRead: true,
    },
    {
      userId: "admin",
      title: "Session Request Rejected",
      message: "The session request (reschedule) by teacher: Mr. Robert has been rejected.",
      type: "session_request_rejected",
      isRead: false,
    },
  ];

  for (const data of notificationsData) {
    await prisma.notification.create({ data });
  }

  console.log("Seeded notifications.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedNotifications()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
