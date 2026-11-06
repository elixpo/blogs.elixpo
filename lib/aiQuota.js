
// Atomic daily AI quota accounting.

//
// The counter lives on `users` (ai_usage_today + ai_usage_date, UTC day).
// The check and increment happen in one conditional UPDATE to prevent
// concurrent requests from bypassing the daily quota.

export function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Try to consume one AI request from the user's daily allowance.
 *
 * @param {D1Database} db
 * @param {string} userId
 * @param {number} limit Requests allowed per UTC day
 * @param {string} [today] UTC day (YYYY-MM-DD), injectable for tests
 * @returns {Promise<boolean>}
 */
export async function claimAIQuota(
  db,
  userId,
  limit,
  today = utcDay()
) {
  if (!db || !userId || !Number.isInteger(limit) || limit < 0) {
    throw new TypeError("Invalid AI quota arguments");
  }

  const result = await db.prepare(`
    UPDATE users
    SET
      ai_usage_today = CASE
        WHEN ai_usage_date = ?
        THEN COALESCE(ai_usage_today, 0) + 1
        ELSE 1
      END,
      ai_usage_date = ?
    WHERE id = ?
      AND (
        CASE
          WHEN ai_usage_date = ?
          THEN COALESCE(ai_usage_today, 0)
          ELSE 0
        END
      ) < ?
  `).bind(
    today,
    today,
    userId,
    today,
    limit
  ).run();

  return (result?.meta?.changes ?? 0) > 0;
}
