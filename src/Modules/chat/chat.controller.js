import * as ChatService from "./chat.service.js";
import { successResponse, errorResponse } from "../../Utils/Response.js";

/**
 * Chat Controller
 * Handles HTTP requests for the chat system
 */

/**
 * Create or get a conversation
 * POST /api/chat/conversations
 */
export const createConversation = async (req, res, next) => {
  try {
    const { teacherId, studentId } = req.body;
    const currentUser = req.user;

    // Validation: Student can only start with a teacher, Teacher can only start with a student
    if (currentUser.role.name === "student" && currentUser.student.id !== studentId) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "CAN_ONLY_CREATE_CONVERSATIONS_FOR_YOURSELF",
        messageParams: {},
        details: null,
      });
    }
    if (currentUser.role.name === "teacher" && currentUser.teacher.id !== teacherId) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "CAN_ONLY_CREATE_CONVERSATIONS_FOR_YOURSELF",
        messageParams: {},
        details: null,
      });
    }

    const conversation = await ChatService.createConversation(teacherId, studentId, currentUser);
    return successResponse({
      res,
      req,
      status: 201,
      message: "CONVERSATION_CREATED_SUCCESS",
      data: conversation,
    });
  } catch (error) {
    console.error("ChatController (createConversation) Error:", error);
    return errorResponse({
      req,
      next,
      status: 500,
      message: "INTERNAL_SERVER_ERROR",
      messageParams: {},
      details: null,
    });
  }
};

/**
 * Get user's conversations
 * GET /api/chat/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role.name;

    const conversations = await ChatService.getConversations(userId, role);
    return successResponse({
      res,
      req,
      status: 200,
      message: "CONVERSATIONS_FETCHED_SUCCESS",
      data: conversations,
    });
  } catch (error) {
    console.error("ChatController (getConversations) Error:", error);
    return errorResponse({
      req,
      next,
      status: 500,
      message: "INTERNAL_SERVER_ERROR",
      messageParams: {},
      details: null,
    });
  }
};

/**
 * Get messages for a conversation
 * GET /api/chat/conversations/:id/messages
 */
export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;
    const userId = req.user.id;
    const role = req.user.role.name;

    // Check participation
    const canAccess = await ChatService.isParticipant(id, userId, role);
    if (!canAccess) {
      return errorResponse({
        req,
        next,
        status: 403,
        message: "UNAUTHORIZED_CONVERSATION_ACCESS",
        messageParams: {},
        details: null,
      });
    }

    const messages = await ChatService.getMessages(
      id,
      parseInt(page) || 1,
      parseInt(limit) || 50,
      userId
    );

    return successResponse({
      res,
      req,
      status: 200,
      message: "MESSAGES_FETCHED_SUCCESS",
      data: messages,
    });
  } catch (error) {
    console.error("ChatController (getMessages) Error:", error);
    return errorResponse({
      req,
      next,
      status: 500,
      message: "INTERNAL_SERVER_ERROR",
      messageParams: {},
      details: null,
    });
  }
};
