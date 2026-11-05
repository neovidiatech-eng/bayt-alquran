import { connection, notificationQueue } from "../Radis/Connection.js";
import { Worker } from "bullmq";

export const addNotificationJob = async ({
  scheduleId,
  studentId,
  type,
  sendAt,
}) => {
  const job = await notificationQueue.add(
    "send-notification",
    { scheduleId, studentId, type },
    {
      jobId: scheduleId, // استخدام ID الجدول كـ ID للـ Job لسهولة المسح
      delay: Math.max(0, sendAt - new Date()),
    }, // الفارق بالمللي ثانية
  );
  console.log(`Added job with ID: ${job.id}`);
};

export const removeNotificationJob = async (scheduleId) => {
  const job = await notificationQueue.getJob(scheduleId);
  if (job) {
    await job.remove();
    console.log(`Removed job associated with schedule ${scheduleId}`);
  }
};

const worker = new Worker(
  "notifications",
  async (job) => {
    const { scheduleId, studentId, type } = job.data;

    // هنا تبعت الإشعار (مثلاً Email أو Push)
    console.log(
      `Sending ${type} notification to student ${studentId} for schedule ${scheduleId}`,
    );
  },
  { connection },
);
