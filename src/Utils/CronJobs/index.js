import cron from "node-cron";
import * as db from "../../database/dbService.js";

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

export const startCronJobs = () => {
     deleteSoftDeletedMessages();
     console.log("Cron jobs initialized.");
};
