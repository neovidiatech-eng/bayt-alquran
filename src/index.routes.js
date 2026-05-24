import { Router } from "express";
import path from "node:path";
import express from "express";

// Router imports
import authRouter from "./Modules/Authentication/auth.routes.js";
import currencyRouter from "./Modules/Transactions/Currency/currency.routes.js";
import subscriptionRouter from "./Modules/Subscription/subscription.routes.js";
import systemRouter from "./Modules/System/system.routes.js";
import teacherRouter from "./Modules/Teachers/teachers.routes.js";
import studentRouter from "./Modules/Students/students.routes.js";
import schedulesRouter from "./Modules/Schedules/schedules.routes.js";
import calendarRouter from "./Modules/Calendar/calendar.routes.js";
import financesRouter from "./Modules/Finances/finances.routes.js";
import studentDashboardRouter from "./Modules/StudentDashboard/studentDashboard.routes.js";
import settingsRouter from "./Modules/Settings/settings.routes.js";
import homeworkRouter from "./Modules/Homework/homework.routes.js";
import examRouter from "./Modules/Exams/exams.routes.js";
import sessionRequestsRouter from "./Modules/SessionRequests/sessionRequests.routes.js";
import teacherDashboardRouter from "./Modules/TeacherDashboard/TeacherDashboard.routes.js";
import transactionsRouter from "./Modules/Transactions/Transactions/Transactions.routes.js";
import withdrawalsRouter from "./Modules/Withdrawals/withdrawals.routes.js";
import chatRouter from "./Modules/chat/chat.routes.js";
import coursesRouter from "./Modules/courses/courses.routes.js";
import parentsRouter from "./Modules/Parents/parents.routes.js";

const rootRouter = Router();

// API Routes
rootRouter.use("/auth", authRouter);
rootRouter.use("/transactions/currency", currencyRouter);
rootRouter.use("/transactions", transactionsRouter);
rootRouter.use("/subscription", subscriptionRouter);
rootRouter.use("/system", systemRouter);
rootRouter.use("/students", studentRouter);
rootRouter.use("/teachers", teacherRouter);
rootRouter.use("/schedules", schedulesRouter);
rootRouter.use("/calendar", calendarRouter);
rootRouter.use("/finances", financesRouter);
rootRouter.use("/student", studentDashboardRouter);
rootRouter.use("/settings", settingsRouter);
rootRouter.use("/teacher", teacherDashboardRouter);
rootRouter.use("/homework", homeworkRouter);
rootRouter.use("/exams", examRouter);
rootRouter.use("/session-requests", sessionRequestsRouter);
rootRouter.use("/withdrawals", withdrawalsRouter);
rootRouter.use("/chat", chatRouter);
rootRouter.use("/courses", coursesRouter);
rootRouter.use("/parent", parentsRouter);

// Static files
rootRouter.use("/uploads", express.static(path.resolve("./uploads")));

// Root health check
rootRouter.get("/", (req, res) => {
  res.json({ message: req.t("WELCOME_MESSAGE") });
});

export default rootRouter;
