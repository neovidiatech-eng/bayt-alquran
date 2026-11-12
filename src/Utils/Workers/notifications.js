import { connection, notificationQueue } from "../Redis/Connection.js";
import { Worker } from "bullmq";
import * as db from "../../database/dbService.js";
import { sendEmail } from "../Mailer/SendEmail.js";
import { getMessage } from "../i18n.js";

const formatSessionDate = (date, timezone = "Africa/Cairo") => {
  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(date);
  }
};

export const addNotificationJob = async ({
  scheduleId,
  studentId,
  type,
  sendAt,
}) => {
  await notificationQueue.add(
    "send-notification",
    { scheduleId, studentId, type },
    {
      jobId: scheduleId,
      delay: Math.max(0, sendAt - new Date()),
    },
  );
};

export const removeNotificationJob = async (scheduleId) => {
  const job = await notificationQueue.getJob(scheduleId);
  if (job) {
    await job.remove();
  }
};

const worker = new Worker(
  "notifications",
  async (job) => {
    const { scheduleId, studentId, type } = job.data;

    const schedule = await db.findFirst({
      model: "schedule",
      where: {
        id: scheduleId,
        studentId,
        status: { not: "cancelled" },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
                timezone: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!schedule?.student?.user?.email) {
      console.warn(
        `Skipped ${type} notification for schedule ${scheduleId}: student email not found`,
      );
      return;
    }

    const timezone = schedule.student.user.timezone || "Africa/Cairo";
    const sessionDate = formatSessionDate(schedule.start_time, timezone);
    const subject = getMessage("SESSION_REMINDER_EMAIL_SUBJECT", "ar");
    const text = getMessage("SESSION_REMINDER_EMAIL_TEXT", "ar", {
      name: schedule.student.user.name || "عزيزنا المشترك",
      title: schedule.title,
      teacher: schedule.teacher?.user?.name || "معلمك",
      time: sessionDate,
      link: schedule.link,
    });

    const result = await sendEmail({
      email: schedule.student.user.email,
      subject,
      text,
      username: schedule.student.user.name || "عزيزنا المشترك",
      lang: "ar",
      variant: "session_reminder",
      metadata: {
        sessionTitle: schedule.title,
        teacherName: schedule.teacher?.user?.name || "معلمك",
        sessionTime: sessionDate,
      },
      actionUrl: schedule.link,
      actionText: "انضم إلى الجلسة",
    });

    if (!result.success) {
      throw new Error(
        `Failed to send ${type} notification for schedule ${scheduleId}: ${result.error}`,
      );
    }
  },
  { connection },
);
