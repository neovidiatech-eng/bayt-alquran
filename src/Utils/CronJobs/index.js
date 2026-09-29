import cron from "node-cron";
import * as db from "../../database/dbService.js";
import { autoResolveExpiredSessions } from "../../Modules/Schedules/schedules.service.js";

const deleteSoftDeletedMessages = () => {
     // Runs daily at midnight — deletes messages where deletedAt is 30+ days ago
     cron.schedule("0 0 * * *", async () => {
          try {
               const thirtyDaysAgo = new Date();
               thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

               console.log(`[Cron] Hard deleting messages soft-deleted before ${thirtyDaysAgo.toISOString()}...`);

               const result = await db.deleteMany({
                    model: "Message",
                    where: {
                         deletedAt: {
                              not: null,
                              lte: thirtyDaysAgo, 
                         },
                    },
               });
               console.log(`[Cron] Done — ${result.count} messages permanently deleted.`);
          } catch (error) {
               console.error("[Cron] Error in deleteSoftDeletedMessages:", error);
          }
     });
};

const scheduleExpiredSessionsResolution = () => {
     // Runs every hour — auto resolves sessions expired by 2+ days
     cron.schedule("0 * * 0 0", async () => {
          try {
               console.log("[Cron] Auto-resolving sessions expired by 2+ days...");
               const result = await autoResolveExpiredSessions();
               console.log(`[Cron] Done — processed ${result.totalProcessed} sessions (${result.completedCount} completed, ${result.missedCount} missed).`);
          } catch (error) {
               console.error("[Cron] Error in autoResolveExpiredSessions:", error);
          }
     });
};

export const startCronJobs = () => {
     deleteSoftDeletedMessages();
     scheduleExpiredSessionsResolution();
     console.log("Cron jobs initialized.");
};

