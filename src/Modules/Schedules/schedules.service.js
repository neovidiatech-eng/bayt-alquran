import * as db from "../../database/dbService.js";
import { getSettingsData } from "../Settings/settings.controller.js";

/**
 * Auto-resolves schedules whose end_time is older than 2 days (48 hours)
 * and whose status is still "scheduled" or "ongoing".
 *
 * Rules:
 * - If both student and teacher attended -> status = "completed", update student sessions_attended, credit teacher wallet.
 * - If either student or teacher missed -> status = "missed". If teacher was absent, refund 1 session_remaining to student.
 */
export const autoResolveExpiredSessions = async () => {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const expiredSchedules = await db.findMany({
    model: "schedule",
    where: {
      end_time: { lte: twoDaysAgo },
      status: { in: ["scheduled", "ongoing"] },
    },
    include: {
      scheduleLogs: true,
      student: true,
      teacher: { include: { user: true } },
    },
  });

  let completedCount = 0;
  let missedCount = 0;

  for (const session of expiredSchedules) {
    await db.transaction(async (tx) => {
      let log = session.scheduleLogs?.[0];

      if (!log) {
        log = await tx.upsertOne({
          model: "scheduleLog",
          where: { scheduleId: session.id },
          update: {},
          create: {
            scheduleId: session.id,
            isStudentAttended: false,
          },
        });
      }

      const teacherActuallyAttended =
        log.isTeacherCompleted === true || Boolean(log.joinTime_teacher);

      const studentActuallyAttended =
        log.isStudentAttended === true || Boolean(log.joinTime_student);

      if (studentActuallyAttended && teacherActuallyAttended) {
        // Both attended -> COMPLETED
        await tx.updateOne({
          model: "scheduleLog",
          where: { id: log.id },
          data: {
            isStudentAttended: true,
            isTeacherCompleted: true,
          },
        });

        if (session.studentId) {
          await tx.updateOne({
            model: "student",
            where: { id: session.studentId },
            data: { sessions_attended: { increment: 1 } },
          });
        }

        // Calculate payout for teacher
        const sessionDurationHours =
          (new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) /
          (60 * 1000 * 60);

        let payoutAmount = sessionDurationHours * (session.teacher?.hour_price || 0);

        if (log.isTeacherLate && log.joinTime_teacher) {
          const settings = await getSettingsData();
          const rules = settings?.lateDiscountRules || [];

          const diffMinutes =
            (new Date(log.joinTime_teacher).getTime() - new Date(session.start_time).getTime()) /
            (60 * 1000);

          const sortedRules = [...rules].sort((a, b) => b.lateMinutes - a.lateMinutes);
          const matchedRule = sortedRules.find((rule) => diffMinutes >= rule.lateMinutes);

          if (matchedRule) {
            const discountFactor = 1 - matchedRule.discountPercentage / 100;
            payoutAmount = payoutAmount * discountFactor;
          }
        }

        if (session.teacher?.user_id && payoutAmount > 0) {
          const teacherWallet = await tx.findFirst({
            model: "Wallet",
            where: { userId: session.teacher.user_id },
          });

          if (teacherWallet) {
            await tx.updateOne({
              model: "Wallet",
              where: { id: teacherWallet.id },
              data: { balance: { increment: payoutAmount } },
            });
          }
        }

        await tx.updateOne({
          model: "schedule",
          where: { id: session.id },
          data: { status: "completed" },
        });

        completedCount++;
      } else {
        // Either or both did not attend -> MISSED
        await tx.updateOne({
          model: "scheduleLog",
          where: { id: log.id },
          data: {
            isStudentAttended: studentActuallyAttended,
            isTeacherCompleted: teacherActuallyAttended,
          },
        });

        // If teacher was absent, refund student 1 remaining session
        if (!teacherActuallyAttended && session.studentId) {
          await tx.updateOne({
            model: "student",
            where: { id: session.studentId },
            data: { sessions_remaining: { increment: 1 } },
          });
        }

        await tx.updateOne({
          model: "schedule",
          where: { id: session.id },
          data: { status: "missed" },
        });

        missedCount++;
      }
    });
  }

  return {
    totalProcessed: expiredSchedules.length,
    completedCount,
    missedCount,
  };
};
