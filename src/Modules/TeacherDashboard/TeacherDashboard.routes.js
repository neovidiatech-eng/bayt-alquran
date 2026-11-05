import { Router } from "express";
import profileRouter from "./Profile/profile.routes.js";
import transactionsRouter from "./transactions/transactions.routes.js";


const router = Router();
router.use("/profile", profileRouter);
router.use("/transactions", transactionsRouter);    



export default router;