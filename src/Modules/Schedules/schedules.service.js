import * as db from "../../database/dbService.js";
import { getSettingsData } from "../Settings/settings.controller.js";

/**
 * Safely extracts the scheduleLog object whether Prisma returns an array or single object.
 */
export const getScheduleLog = (session) => {
  if (!session || !session.scheduleLogs) return null;
  return Array.isArray(session.scheduleLogs)
    ? session.scheduleLogs[0]
    : session.scheduleLogs;
};

/**
 * Resolves a single schedule session when it has ended.
 * Determines attendance (completed vs missed), calculates payouts / discounts for teachers,
 * refunds students if teacher missed, updates status & logs, and sends notifications.
 */
export const resolveSingleSession = async (sessionOrId, options = {}) => {
  const { tx: externalTx, t } = options;

  const session =
    typeof sessionOrId === "string"
      ? await (externalTx || db).findOne({
          model: "schedule",
          where: { id: sessionOrId },
          include: {
            scheduleLogs: true,
            student: { include: { user: true } },
            teacher: { include: { user: true } },
          },
        })
      : sessionOrId;

  if (
    !session ||
    session.status === "completed" ||
    session.status === "missed" ||
    session.status === "cancelled"
  ) {
    return null;
  }

  const executeResolution = async (tx) => {
    let log = getScheduleLog(session);

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
        (new Date(session.end_time).getTime() -
          new Date(session.start_time).getTime()) /
        (60 * 1000 * 60);

      let payoutAmount =
        sessionDurationHours * (session.teacher?.hour_price || 0);

      if (log.isTeacherLate && log.joinTime_teacher) {
        const settings = await getSettingsData();
        const rules = settings?.lateDiscountRules || [];

        const diffMinutes =
          (new Date(log.joinTime_teacher).getTime() -
            new Date(session.start_time).getTime()) /
          (60 * 1000);

        const sortedRules = [...rules].sort(
          (a, b) => b.lateMinutes - a.lateMinutes
        );
        const matchedRule = sortedRules.find(
          (rule) => diffMinutes >= rule.lateMinutes
        );

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

      return { status: "completed" };
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

      // Create notification for missed session if student user exists
      const studentUserId =
        session.student?.user_id || session.student?.user?.id;
      if (studentUserId) {
        await tx.create({
          model: "notification",
          data: {
            userId: studentUserId,
            title: t ? t("NOTIFICATION_SESSION_MISSED_TITLE") : "Session Missed",
            message: t
              ? t("NOTIFICATION_SESSION_MISSED_MSG", { title: session.title })
              : `The session ${session.title} was marked as missed.`,
            type: "session_missed",
          },
        });
      }

      return { status: "missed" };
    }
  };

  if (externalTx) {
    return await executeResolution(externalTx);
  }
  return await db.transaction(executeResolution);
};

/**
 * Synchronizes the status of all active (non-cancelled) schedules against current time.
 * - Past sessions (end_time <= now) get finalized/resolved (completed or missed).
 * - Current sessions (start_time <= now < end_time) get set to "ongoing" if participants joined.
 * - Future sessions (start_time > now) get reset to "scheduled" if they were accidentally "ongoing".
 */
export const syncAllSessionStatuses = async (options = {}) => {
  const { t, cutoffTime } = options;
  const now = new Date();

  const where = {
    status: { not: "cancelled" },
  };

  if (cutoffTime) {
    where.end_time = { lte: cutoffTime };
  }

  const sessions = await db.findMany({
    model: "schedule",
    where,
    include: {
      scheduleLogs: true,
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
  });

  let updatedCount = 0;
  let completedCount = 0;
  let missedCount = 0;
  let ongoingCount = 0;

  for (const session of sessions) {
    const isPast = new Date(session.end_time) <= now;
    const isCurrent =
      new Date(session.start_time) <= now && new Date(session.end_time) > now;
    const isFuture = new Date(session.start_time) > now;

    if (isPast) {
      if (session.status !== "completed" && session.status !== "missed") {
        const res = await resolveSingleSession(session, { t });
        if (res) {
          updatedCount++;
          if (res.status === "completed") completedCount++;
          if (res.status === "missed") missedCount++;
        }
      }
    } else if (isCurrent) {
      if (session.status === "scheduled" || session.status === "planned") {
        const log = getScheduleLog(session);

        if (log?.joinTime_teacher || log?.joinTime_student) {
          await db.updateOne({
            model: "schedule",
            where: { id: session.id },
            data: { status: "ongoing" },
          });
          updatedCount++;
          ongoingCount++;
        }
      }
    } else if (isFuture) {
      if (session.status === "ongoing") {
        await db.updateOne({
          model: "schedule",
          where: { id: session.id },
          data: { status: "scheduled" },
        });
        updatedCount++;
      }
    }
  }

  return {
    totalProcessed: sessions.length,
    updatedCount,
    completedCount,
    missedCount,
    ongoingCount,
  };
};

/**
 * Backward compatibility wrapper for auto-resolving expired sessions.
 */
export const autoResolveExpiredSessions = async () => {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const result = await syncAllSessionStatuses({ cutoffTime: twoDaysAgo });
  return {
    totalProcessed: result.totalProcessed,
    completedCount: result.completedCount,
    missedCount: result.missedCount,
    updatedCount: result.updatedCount,
  };
};
