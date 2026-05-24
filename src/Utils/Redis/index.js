import { redis } from "../Radis/Connection.js";

/**
 * Redis Service for Chat System
 * Handles online status, typing indicators, and unread counts
 */

/**
 * Set user online status
 * @param {string} userId - ID of the user
 * @param {string} socketId - ID of the socket connection
 * @returns {Promise<boolean>} - True if this is the user's first connection
 */
export const setUserOnline = async (userId, socketId) => {
  try {
    const key = `online:${userId}`;
    // Add socket to user's connection set
    await redis.sAdd(key, socketId);
    await redis.expire(key, 24 * 60 * 60); // 24 hours TTL
    
    const count = await redis.sCard(key);
    return count === 1; // Return true only if first connection
  } catch (error) {
    console.error("Redis Error (setUserOnline):", error);
    return false;
  }
};

/**
 * Remove user online status
 * @param {string} userId - ID of the user
 * @param {string} socketId - ID of the socket connection
 * @returns {Promise<boolean>} - True if this was the last connection
 */
export const setUserOffline = async (userId, socketId) => {
  try {
    const key = `online:${userId}`;
    await redis.sRem(key, socketId);
    
    const count = await redis.sCard(key);
    if (count === 0) {
      await redis.del(key);
      return true; // Last connection removed
    }
    return false;
  } catch (error) {
    console.error("Redis Error (setUserOffline):", error);
    return false;
  }
};

/**
 * Get all user online socket IDs
 * @param {string} userId - ID of the user
 * @returns {Promise<string[]>} - Array of socket IDs
 */
export const getUserSockets = async (userId) => {
  try {
    return await redis.sMembers(`online:${userId}`);
  } catch (error) {
    console.error("Redis Error (getUserSockets):", error);
    return [];
  }
};

/**
 * Check if a user is online
 * @param {string} userId - ID of the user
 * @returns {Promise<boolean>}
 */
export const isUserOnline = async (userId) => {
  try {
    const count = await redis.sCard(`online:${userId}`);
    return count > 0;
  } catch (error) {
    console.error("Redis Error (isUserOnline):", error);
    return false;
  }
};

/**
 * Set typing status
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the user typing
 * @returns {Promise<void>}
 */
export const setTypingStatus = async (conversationId, userId) => {
  try {
    await redis.set(`typing:${conversationId}:${userId}`, "1", {
      EX: 3, // 3 seconds auto-expire
    });
  } catch (error) {
    console.error("Redis Error (setTypingStatus):", error);
  }
};

/**
 * Remove typing status
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the user who stopped typing
 * @returns {Promise<void>}
 */
export const removeTypingStatus = async (conversationId, userId) => {
  try {
    await redis.del(`typing:${conversationId}:${userId}`);
  } catch (error) {
    console.error("Redis Error (removeTypingStatus):", error);
  }
};

/**
 * Increment unread count for a user in a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the recipient user
 * @returns {Promise<void>}
 */
export const incrementUnreadCount = async (conversationId, userId) => {
  try {
    await redis.incr(`unread:${conversationId}:${userId}`);
  } catch (error) {
    console.error("Redis Error (incrementUnreadCount):", error);
  }
};

/**
 * Reset unread count for a user in a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the user
 * @returns {Promise<void>}
 */
export const resetUnreadCount = async (conversationId, userId) => {
  try {
    await redis.set(`unread:${conversationId}:${userId}`, "0");
  } catch (error) {
    console.error("Redis Error (resetUnreadCount):", error);
  }
};

/**
 * Get unread count for a user in a conversation
 * @param {string} conversationId - ID of the conversation
 * @param {string} userId - ID of the user
 * @returns {Promise<number>}
 */
export const getUnreadCount = async (conversationId, userId) => {
  try {
    const count = await redis.get(`unread:${conversationId}:${userId}`);
    return count ? parseInt(count) : 0;
  } catch (error) {
    console.error("Redis Error (getUnreadCount):", error);
    return 0;
  }
};

/**
 * Check if a user is rate limited for sending messages
 * @param {string} userId - ID of the user
 * @returns {Promise<boolean>} - True if rate limited
 */
export const isRateLimited = async (userId) => {
  try {
    const key = `rate_limit:${userId}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    
    return count > 30; // Max 30 messages per minute
  } catch (error) {
    console.error("Redis Error (isRateLimited):", error);
    return false; // Fail open to allow messages if redis is down
  }
};
