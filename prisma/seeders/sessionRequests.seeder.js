import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedSessionRequests() {
  console.log("Start seeding session requests...");

  const [users, schedules, adminUser] = await Promise.all([
    prisma.user.findMany({ take: 5 }),
    prisma.schedule.findMany({ take: 3 }),
    prisma.user.findFirst({
      where: {
        OR: [
          { email: "admin@lms.com" },
          { email: "superadmin@lms.com" },
        ],
      },
    }),
  ]);

  if (users.length === 0) {
    console.warn("No users found. Skipping session requests seeding.");
    return;
  }

  const sampleRequestsData = [
    {
      userIndex: 0,
      role: "student",
      type: "reschedule",
      status: "pending",
      reason: "Requesting to move session to tomorrow due to personal conflict.",
    },
    {
      userIndex: Math.min(1, users.length - 1),
      role: "teacher",
      type: "extra_session",
      status: "approved",
      reason: "Additional revision session for exam preparation.",
      adminNotes: "Approved by admin.",
    },
    {
      userIndex: Math.min(2, users.length - 1),
      role: "student",
      type: "cancellation",
      status: "rejected",
      reason: "Sick leave request.",
      adminNotes: "Notice given less than 2 hours before session.",
    },
  ];

  for (let i = 0; i < sampleRequestsData.length; i++) {
    const item = sampleRequestsData[i];
    const requester = users[item.userIndex];
    const schedule = schedules[i % schedules.length] || null;

    if (!requester) continue;

    const existingRequest = await prisma.session_request.findFirst({
      where: {
        requesterId: requester.id,
        type: item.type,
      },
    });

    if (existingRequest) {
      await prisma.session_request.update({
        where: { id: existingRequest.id },
        data: {
          status: item.status,
          reason: item.reason,
          adminId: item.status !== "pending" ? adminUser?.id : null,
          adminNotes: item.adminNotes || null,
        },
      });
    } else {
      await prisma.session_request.create({
        data: {
          requesterId: requester.id,
          requesterRole: item.role,
          sessionId: schedule?.id || null,
          type: item.type,
          status: item.status,
          reason: item.reason,
          adminId: item.status !== "pending" ? adminUser?.id : null,
          adminNotes: item.adminNotes || null,
        },
      });
    }
  }

  console.log("Seeded session requests successfully.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedSessionRequests()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
