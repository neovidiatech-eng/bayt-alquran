import * as db from "../../database/dbService.js";

/**
 * Evaluates student's current sessions_attended and points against active Rank criteria,
 * and automatically upgrades/assigns the student's rank if eligible.
 *
 * @param {string} studentId - The UUID of the student to evaluate.
 * @returns {Promise<object|null>} The updated rank object if rank changed, otherwise null.
 */
export async function checkAndUpdateStudentRank(studentId) {
  if (!studentId) return null;

  const student = await db.findOne({
    model: "student",
    where: { id: studentId },
    select: {
      id: true,
      user_id: true,
      sessions_attended: true,
      points: true,
      rankId: true,
    },
  });

  if (!student) return null;

  const activeRanks = await db.findMany({
    model: "Rank",
    where: { active: true },
    orderBy: [
      { minSessions: "asc" },
      { minPoints: "asc" },
    ],
  });

  if (!activeRanks || activeRanks.length === 0) return null;

  // Filter ranks the student qualifies for
  const qualifyingRanks = activeRanks.filter((rank) => {
    const meetsSessions = (student.sessions_attended || 0) >= rank.minSessions;
    const meetsPoints = (student.points || 0) >= rank.minPoints;
    return meetsSessions && meetsPoints;
  });

  if (qualifyingRanks.length === 0) return null;

  // Take the highest qualifying rank
  const highestQualifyingRank = qualifyingRanks[qualifyingRanks.length - 1];

  // If the student's rank has changed to a higher/new rank, update in database
  if (highestQualifyingRank.id !== student.rankId) {
    await db.updateOne({
      model: "student",
      where: { id: studentId },
      data: { rankId: highestQualifyingRank.id },
    });

    return highestQualifyingRank;
  }

  return null;
}
