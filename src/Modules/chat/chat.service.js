import * as db from "../../database/dbService.js";
import {
  getUnreadCount,
  resetUnreadCount,
  incrementUnreadCount,
} from "../../Utils/Redis/index.js";

/**
 * Chat Service
 * Handles business logic for conversations and messages
 */

/**
 * Create or get an existing conversation between a student and a teacher
 * @param {string} teacherId - ID of the teacher profile
 * @param {string} studentId - ID of the student profile
 * @param {object} currentUser - The user making the request
 * @returns {Promise<object>} - The conversation object
 * @throws {Error} - If validation fails
 */
export const createConversation = async (teacherId, studentId, currentUser) => {
  try {
    // 1. Validate both parties exist
    const [teacher, student] = await Promise.all([
      db.findOne({
        model: "teacher",
        where: { id: teacherId },
        select: { id: true, user_id: true },
      }),
      db.findOne({
        model: "student",
        where: { id: studentId },
        select: { id: true, user_id: true },
      }),
    ]);

    if (!teacher || !student) {
      throw new Error("TEACHER_OR_STUDENT_NOT_FOUND");
    }

    // 2. Validate relationship via schedule
    const scheduleCount = await db.count({
      model: "schedule",
      where: {
        teacherId,
        studentId,
      },
    });

    if (scheduleCount === 0) {
      throw new Error("NO_SCHEDULED_SESSIONS_FOUND");
    }

    // 3. Check if conversation already exists
    let conversation = await db.findFirst({
      model: "Conversation",
      where: {
        teacherId,
        studentId,
      },
      include: {
        teacher: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        student: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (conversation) {
      return conversation;
    }

    // 4. Create new conversation
    conversation = await db.create({
      model: "Conversation",
      data: {
        teacherId,
        studentId,
        // We also store user IDs for easier real-time tracking if needed,
        // though the relation is with profile IDs
        teacherUserId: teacher.user_id,
        studentUserId: student.user_id,
      },
      include: {
        teacher: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        student: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    return conversation;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all conversations for a user based on their role
 * @param {string} userId - The user's ID
 * @param {string} role - The user's role (admin, teacher, student)
 * @returns {Promise<Array>} - List of conversations with last message and unread count
 */
export const getConversations = async (userId, role) => {
  try {
    let whereClause = {};

    if (role === "teacher") {
      whereClause = { teacher: { user_id: userId } };
    } else if (role === "student") {
      whereClause = { student: { user_id: userId } };
    } else if (role === "admin") {
      whereClause = {}; // Admin sees all
    } else {
      throw new Error("UNAUTHORIZED_ROLE");
    }

    const conversations = await db.findMany({
      model: "Conversation",
      where: whereClause,
      include: {
        teacher: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        student: {
          select: { user: { select: { id: true, name: true, email: true } } },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { name: true, email: true } } },
        },
      },
    });

    // Map and enrich with unread counts from Redis
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = conv.messages[0] || null;
        const unreadCount = await getUnreadCount(conv.id, userId);

        // Determine "other party" details
        let otherParty = {};
        if (role === "teacher") {
          otherParty = conv.student.user;
        } else if (role === "student") {
          otherParty = conv.teacher.user;
        } else {
          // Admin sees both
          otherParty = {
            teacher: conv.teacher.user,
            student: conv.student.user,
          };
        }

        return {
          conversationId: conv.id,
          otherParty,
          lastMessage: lastMessage ? lastMessage.content : null,
          lastMessageAt: lastMessage ? lastMessage.createdAt : null,
          unreadCount,
        };
      }),
    );

    return enrichedConversations;
  } catch (error) {
    throw error;
  }
};

/**
 * Get messages for a specific conversation with pagination
 * @param {string} conversationId - ID of the conversation
 * @param {number} page - Page number
 * @param {number} limit - Number of messages per page
 * @param {string} userId - ID of the user requesting
 * @returns {Promise<Array>} - List of messages
 */
export const getMessages = async (
  conversationId,
  page = 1,
  limit = 50,
  userId,
) => {
  try {
    const skip = (page - 1) * limit;

    // Fetch messages
    const messages = await db.findMany({
      model: "Message",
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: skip,
      include: {
        sender: {
          select: { id: true, name: true, role: { select: { name: true } } },
        },
      },
    });

    // Automatically mark messages as read for this user
    await db.updateMany({
      model: "Message",
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reset unread count in Redis
    await resetUnreadCount(conversationId, userId);

    return messages;
  } catch (error) {
    throw error;
  }
};

/**
 * Save a new message to the database
 * @param {string} conversationId - ID of the conversation
 * @param {string} senderId - ID of the sender (user)
 * @param {string} content - Message content
 * @returns {Promise<object>} - The created message object
 */
export const saveMessage = async (conversationId, senderId, content) => {
  try {
    // 1. Validation
    if (!content || content.trim().length === 0) {
      throw new Error("MESSAGE_CONTENT_EMPTY");
    }
    if (content.length > 1000) {
      throw new Error("MESSAGE_CONTENT_TOO_LONG");
    }

    // 2. Save to DB
    const message = await db.create({
      model: "Message",
      data: {
        conversationId,
        senderId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });

    // 3. Update unread count for recipient in Redis
    const conversation = await db.findOne({
      model: "Conversation",
      where: { id: conversationId },
      select: { teacherUserId: true, studentUserId: true },
    });

    const recipientId =
      senderId === conversation.teacherUserId
        ? conversation.studentUserId
        : conversation.teacherUserId;
    await incrementUnreadCount(conversationId, recipientId);

    return message;
  } catch (error) {
    throw error;
  }
};

/**
 * Check if a user is a participant in a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the user
 * @param {string} role - Role of the user
 * @returns {Promise<boolean>}
 */
export const isParticipant = async (conversationId, userId, role) => {
  if (role === "admin") return true;

  const conversation = await db.findFirst({
    model: "Conversation",
    where: {
      id: conversationId,
      OR: [{ teacher: { user_id: userId } }, { student: { user_id: userId } }],
    },
  });

  return !!conversation;
};
