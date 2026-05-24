import { Router } from "express";
import * as chatController from "./chat.controller.js";
import { authentication } from "../../Middlewares/Authentication.js";
import { authorizeResource } from "../../Middlewares/AuthorizationMiddleware.js";

const chatRouter = Router();

// All chat routes require authentication and authorization
chatRouter.use(authentication());
chatRouter.use(authorizeResource("chat"));

/**
 * POST /api/chat/conversations
 * Create or get a conversation between student and teacher
 */
chatRouter.post("/conversations", chatController.createConversation);

/**
 * GET /api/chat/conversations
 * List user's conversations
 */
chatRouter.get("/conversations", chatController.getConversations);

/**
 * GET /api/chat/conversations/:id/messages
 * Get paginated messages for a conversation
 */
chatRouter.get("/conversations/:id/messages", chatController.getMessages);

export default chatRouter;
