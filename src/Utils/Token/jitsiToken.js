import jwt from "jsonwebtoken";

/**
 * Generate a clean room name for a session
 * @param {string} scheduleId
 * @returns {string}
 */
export const buildJitsiRoomName = (scheduleId) => {
  if (!scheduleId) return "bayt-session";
  // Remove non-alphanumeric chars except dashes and underscores
  const sanitized = String(scheduleId).replace(/[^a-zA-Z0-9_-]/g, "");
  return `bayt-session-${sanitized}`;
};

/**
 * Get Jitsi base URL
 * @returns {string}
 */
export const getJitsiBaseUrl = () => {
  return (
    process.env.JITSI_BASE_URL ||
    process.env.PUBLIC_URL ||
    "https://meet.bayt-alquran.net"
  ).replace(/\/$/, "");
};

/**
 * Get Jitsi domain / host for web SDK
 * @returns {string}
 */
export const getJitsiDomain = () => {
  if (process.env.JITSI_DOMAIN) return process.env.JITSI_DOMAIN;
  try {
    const parsed = new URL(getJitsiBaseUrl());
    return parsed.host;
  } catch {
    return "meet.bayt-alquran.net";
  }
};

/**
 * Build static room URL without token
 * @param {string} scheduleId
 * @returns {string}
 */
export const buildJitsiRoomUrl = (scheduleId) => {
  const roomName = buildJitsiRoomName(scheduleId);
  return `${getJitsiBaseUrl()}/${roomName}`;
};

/**
 * Generate a signed Jitsi JWT token for a participant
 * @param {Object} options
 * @param {string|number} options.userId
 * @param {string} options.roomName
 * @param {string} options.userName
 * @param {string} [options.userEmail]
 * @param {string} [options.userAvatar]
 * @param {boolean} [options.isModerator=false]
 * @param {number} [options.ttlSeconds=7200]
 * @returns {string} Signed JWT
 */
export const generateJitsiToken = ({
  userId,
  roomName,
  userName,
  userEmail,
  userAvatar,
  isModerator = false,
  ttlSeconds = 2 * 60 * 60,
}) => {
  const appId =
    process.env.JITSI_APP_ID ||
    process.env.JWT_APP_ID ||
    "bayt-alquran";
  const jwtSecret =
    process.env.JITSI_JWT_SECRET ||
    process.env.JWT_APP_SECRET ||
    process.env.ACCESS_TOKEN_SIGNATURE ||
    "learnx_jitsi_fallback_secret_2026";
  const audience =
    process.env.JITSI_AUDIENCE ||
    process.env.JWT_ACCEPTED_AUDIENCES ||
    "jitsi";
  const sub = process.env.JITSI_SUB || "*";

  if (!userId || !roomName || !userName) {
    throw new Error("JITSI_INVALID_TOKEN_PAYLOAD");
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud: audience,
    iss: appId,
    sub: sub,
    room: roomName,
    nbf: now - 10,
    exp: now + ttlSeconds,

    context: {
      user: {
        id: String(userId),
        name: userName,
        ...(userEmail ? { email: userEmail } : {}),
        ...(userAvatar ? { avatar: userAvatar } : {}),
        moderator: Boolean(isModerator),
        affiliation: isModerator ? "owner" : "member",
      },
      features: {
        recording: isModerator ? "true" : "false",
        livestreaming: isModerator ? "true" : "false",
        "screen-sharing": "true",
      },
    },
  };

  return jwt.sign(payload, jwtSecret, {
    algorithm: "HS256",
  });
};

/**
 * Build complete Jitsi session payload including token, URL and SDK domain
 * @param {Object} params
 * @param {string} params.scheduleId
 * @param {Object} params.user
 * @param {boolean} params.isModerator
 * @param {Date|string} [params.startTime]
 * @param {Date|string} [params.endTime]
 * @returns {Object}
 */
export const buildJitsiSessionData = ({
  scheduleId,
  user,
  isModerator = false,
  startTime,
  endTime,
}) => {
  const roomName = buildJitsiRoomName(scheduleId);

  // Calculate TTL in seconds: till end_time + 30 min buffer, minimum 1 hour (3600)
  let ttlSeconds = 2 * 60 * 60; // 2 hours default
  if (endTime) {
    const endMs = new Date(endTime).getTime();
    const nowMs = Date.now();
    const diffSec = Math.floor((endMs - nowMs) / 1000) + 30 * 60; // +30m
    if (diffSec > 3600) {
      ttlSeconds = diffSec;
    }
  }

  const token = generateJitsiToken({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userAvatar: user.image || user.avatar,
    roomName,
    isModerator,
    ttlSeconds,
  });

  const baseUrl = getJitsiBaseUrl();
  const domain = getJitsiDomain();
  const url = `${baseUrl}/${roomName}?jwt=${token}`;

  return {
    token,
    roomName,
    url,
    domain,
    isModerator: Boolean(isModerator),
  };
};
