import * as ChatService from "../../Modules/chat/chat.service.js";
import * as RedisUtils from "../Redis/index.js";
import * as db from "../../database/dbService.js";

/**
 * Socket.io Logic
 * Handles real-time communication events
 */

export const init_io = (io) => {
  io.on("connection", async (socket) => {
    try {
      const user = socket.user;
      if (!user) return socket.disconnect();

      console.log(`User connected: ${user.name} (${user.role.name})`);

      // 1. Online status tracking
      const isFirstConnection = await RedisUtils.setUserOnline(user.id, socket.id);
      
      // Notify others only if this is the first connection
      if (isFirstConnection) {
        socket.broadcast.emit("user:status", { userId: user.id, status: "online" });
      }
      // 2. Admin Special Handling: Auto-join all rooms
      if (user.role.name === "admin") {
        const allConversations = await db.findMany({ model: "Conversation", select: { id: true } });
        allConversations.forEach(conv => socket.join(`conv_${conv.id}`));
        console.log(`Admin ${user.name} joined all conversation rooms`);
      }

      /**
       * Event: conversation:open
       * Client joins a specific conversation room and fetches initial history
       */
      socket.on("conversation:open", async ({ conversationId }) => {
        try {
          // Check participation
          const canAccess = await ChatService.isParticipant(conversationId, user.id, user.role.name);
          if (!canAccess) {
            return socket.emit("error", { message: "Unauthorized access to this conversation" });
          }

          // Join the room
          socket.join(`conv_${conversationId}`);
          
          // Fetch last 50 messages
          const messages = await ChatService.getMessages(conversationId, 1, 50, user.id);
          
          // Emit initial messages only to this client
          socket.emit("messages:history", { conversationId, messages });
          
          console.log(`User ${user.name} opened conversation ${conversationId}`);
        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      /**
       * Event: message:send
       * Validates sender, saves message, and broadcasts to room
       */
      socket.on("message:send", async ({ conversationId, content }) => {
        try {
          // Rule: Admin is read-only
          if (user.role.name === "admin") {
            return socket.emit("error", { message: "Admins cannot send messages" });
          }

          // Rule: Rate limiting (30 msgs/min)
          const limited = await RedisUtils.isRateLimited(user.id);
          if (limited) {
            return socket.emit("error", { message: "Rate limit exceeded. Please wait a minute." });
          }

          // Check participation
          const canAccess = await ChatService.isParticipant(conversationId, user.id, user.role.name);
          if (!canAccess) {
            return socket.emit("error", { message: "You are not a participant in this conversation" });
          }

          // Save to DB
          const message = await ChatService.saveMessage(conversationId, user.id, content);

          // Broadcast to everyone in the room (including sender's other tabs)
          io.to(`conv_${conversationId}`).emit("message:new", message);

        } catch (error) {
          socket.emit("error", { message: error.message });
        }
      });

      /**
       * Event: typing:start
       * Notifies others that user is typing
       */
      socket.on("typing:start", async ({ conversationId }) => {
        try {
          await RedisUtils.setTypingStatus(conversationId, user.id);
          socket.to(`conv_${conversationId}`).emit("typing:update", {
            userId: user.id,
            conversationId,
            isTyping: true
          });
        } catch (error) {
          console.error("Socket Error (typing:start):", error);
        }
      });

      /**
       * Event: typing:stop
       * Notifies others that user stopped typing
       */
      socket.on("typing:stop", async ({ conversationId }) => {
        try {
          await RedisUtils.removeTypingStatus(conversationId, user.id);
          socket.to(`conv_${conversationId}`).emit("typing:update", {
            userId: user.id,
            conversationId,
            isTyping: false
          });
        } catch (error) {
          console.error("Socket Error (typing:stop):", error);
        }
      });

      /**
       * Event: message:read
       * Marks all messages in conversation as read for the current user
       */
      socket.on("message:read", async ({ conversationId }) => {
        try {
          await db.updateMany({
            model: "Message",
            where: {
              conversationId,
              senderId: { not: user.id },
              isRead: false
            },
            data: { isRead: true }
          });

          await RedisUtils.resetUnreadCount(conversationId, user.id);
          
          // Notify the other party that their messages were read
          socket.to(`conv_${conversationId}`).emit("messages:read", { conversationId, userId: user.id });
        } catch (error) {
          console.error("Socket Error (message:read):", error);
        }
      });

      /**
       * Event: user:status:check
       * Allows client to check the online status of specific users
       */
      socket.on("user:status:check", async ({ userIds }) => {
        try {
          const statuses = await Promise.all(
            userIds.map(async (id) => ({
              userId: id,
              status: (await RedisUtils.isUserOnline(id)) ? "online" : "offline"
            }))
          );
          socket.emit("user:status:list", { statuses });
        } catch (error) {
          console.error("Socket Error (user:status:check):", error);
        }
      });

      socket.on("disconnect", async () => {
        console.log(`User disconnected: ${user.name}`);
        const isLastConnection = await RedisUtils.setUserOffline(user.id, socket.id);
        
        // Notify others only if this was the last connection
        if (isLastConnection) {
          socket.broadcast.emit("user:status", { userId: user.id, status: "offline" });
        }
      });

    } catch (error) {
      console.error("Socket connection error:", error);
      socket.disconnect();
    }
  });
};
