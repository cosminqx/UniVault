import { query } from '../config/db.js';

export async function logAction({ user, actionType, actionDetails, ipAddress }) {
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const userRole = user?.role || null;

  await query(
    `INSERT INTO audit_logs (user_id, user_email, user_role, action_type, action_details, ip_address)
     VALUES ($1, $2, $3::user_role, $4, $5, $6)`,
    [userId, userEmail, userRole, actionType, actionDetails, ipAddress || null]
  );
}
