import { body, param, query as queryValidator } from 'express-validator';
import { query } from '../config/db.js';
import { logAction } from '../utils/audit.js';
import { getMailer } from '../config/mailer.js';
import { env } from '../config/env.js';
import { addResourceToStudent } from '../services/resourceService.js';

export async function listUsers(req, res) {
  const { rows } = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id ASC'
  );
  return res.json({ users: rows });
}

export const updateUserRoleValidation = [
  param('userId').isInt({ min: 1 }),
  body('role').isIn(['administrator', 'profesor', 'student', 'audit']),
  body('isActive').optional().isBoolean()
];

export async function updateUserRole(req, res) {
  const userId = Number(req.params.userId);
  const { role, isActive } = req.body;

  const { rows } = await query(
    `UPDATE users
     SET role = $1::user_role,
         is_active = COALESCE($2, is_active),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, name, email, role, is_active`,
    [role, isActive, userId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await logAction({
    user: req.user,
    actionType: 'user_role_updated',
    actionDetails: `Admin changed user ${rows[0].email} role to ${rows[0].role}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'User role updated.', user: rows[0] });
}

export const revokeRoleValidation = [param('userId').isInt({ min: 1 })];

export async function revokeRole(req, res) {
  const userId = Number(req.params.userId);
  const { deactivate = false } = req.body;

  const { rows } = await query(
    `UPDATE users
     SET role = 'student', is_active = CASE WHEN $1 THEN FALSE ELSE TRUE END, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, role, is_active`,
    [Boolean(deactivate), userId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await logAction({
    user: req.user,
    actionType: 'user_role_revoked',
    actionDetails: `Admin revoked role for ${rows[0].email}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Role revoked.', user: rows[0] });
}

export async function listActivities(req, res) {
  const { rows } = await query('SELECT id, name, token_cost, is_active FROM activities ORDER BY id');
  return res.json({ activities: rows });
}

export const createActivityValidation = [
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('tokenCost').isInt({ min: 0 })
];

export async function createActivity(req, res) {
  const { name, tokenCost } = req.body;
  const { rows } = await query(
    'INSERT INTO activities (name, token_cost) VALUES ($1, $2) RETURNING id, name, token_cost, is_active',
    [name, tokenCost]
  );

  await logAction({
    user: req.user,
    actionType: 'activity_created',
    actionDetails: `Activity ${name} created with cost ${tokenCost}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Activity created.', activity: rows[0] });
}

export const updateActivityValidation = [
  param('activityId').isInt({ min: 1 }),
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('tokenCost').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
];

export async function updateActivity(req, res) {
  const activityId = Number(req.params.activityId);
  const { name, tokenCost, isActive } = req.body;

  const { rows } = await query(
    `UPDATE activities
     SET name = COALESCE($1, name),
         token_cost = COALESCE($2, token_cost),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, name, token_cost, is_active`,
    [name ?? null, tokenCost ?? null, isActive ?? null, activityId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'Activity not found.' });
  }

  await logAction({
    user: req.user,
    actionType: 'activity_updated',
    actionDetails: `Activity ${rows[0].name} updated`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Activity updated.', activity: rows[0] });
}

export const deleteActivityValidation = [param('activityId').isInt({ min: 1 })];

export async function deleteActivity(req, res) {
  const activityId = Number(req.params.activityId);
  const { rowCount } = await query('DELETE FROM activities WHERE id = $1', [activityId]);

  if (!rowCount) {
    return res.status(404).json({ message: 'Activity not found.' });
  }

  await logAction({
    user: req.user,
    actionType: 'activity_deleted',
    actionDetails: `Activity ${activityId} deleted`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Activity deleted.' });
}

export async function getResourceTotals(req, res) {
  const { rows } = await query('SELECT total_tokens, total_vps FROM university_resources WHERE id = 1');
  return res.json({ totals: rows[0] });
}

export const updateResourceTotalsValidation = [
  body('totalTokens').isInt({ min: 0 }),
  body('totalVps').isInt({ min: 0 })
];

export async function updateResourceTotals(req, res) {
  const { totalTokens, totalVps } = req.body;

  await query(
    `UPDATE university_resources
     SET total_tokens = $1, total_vps = $2, updated_at = NOW()
     WHERE id = 1`,
    [totalTokens, totalVps]
  );

  await logAction({
    user: req.user,
    actionType: 'university_resources_updated',
    actionDetails: `Totals updated tokens=${totalTokens}, vps=${totalVps}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'University totals updated.' });
}

export async function calculateDistribution(req, res) {
  const { rows: courseRows } = await query(
    `SELECT c.id, c.title, c.tokens_per_student, c.vps_per_student, COUNT(e.id)::int AS students
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     GROUP BY c.id
     ORDER BY c.id`
  );

  const recommendations = courseRows.map((c) => {
    const tokenBase = Number(c.students) * Number(c.tokens_per_student);
    const vpsBase = Number(c.students) * Number(c.vps_per_student);
    return {
      courseId: c.id,
      title: c.title,
      students: Number(c.students),
      recommendedTokens: Math.ceil(tokenBase * 1.1),
      recommendedVps: Math.ceil(vpsBase * 1.1)
    };
  });

  return res.json({ recommendations });
}

export const confirmDistributionValidation = [
  body('allocations').isArray({ min: 1 }),
  body('allocations.*.courseId').isInt({ min: 1 }),
  body('allocations.*.allocatedTokens').isInt({ min: 0 }),
  body('allocations.*.allocatedVps').isInt({ min: 0 })
];

export async function confirmDistribution(req, res) {
  const { allocations } = req.body;

  for (const item of allocations) {
    await query(
      `INSERT INTO course_allocations (course_id, allocated_tokens, allocated_vps, distribution_confirmed, updated_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (course_id) DO UPDATE
       SET allocated_tokens = EXCLUDED.allocated_tokens,
           allocated_vps = EXCLUDED.allocated_vps,
           distribution_confirmed = TRUE,
           updated_at = NOW()`,
      [item.courseId, item.allocatedTokens, item.allocatedVps]
    );
  }

  await logAction({
    user: req.user,
    actionType: 'resource_distribution_confirmed',
    actionDetails: `Admin confirmed distribution for ${allocations.length} courses`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Distribution confirmed.' });
}

export async function listProfessorSupplementRequests(req, res) {
  const { rows } = await query(
    `SELECT psr.*, c.title AS course_title, u.email AS professor_email
     FROM professor_supplement_requests psr
     JOIN courses c ON c.id = psr.course_id
     JOIN users u ON u.id = psr.professor_id
     WHERE psr.status = 'pending'
     ORDER BY psr.created_at DESC`
  );

  return res.json({ requests: rows });
}

export const approveProfessorSupplementValidation = [
  param('requestId').isInt({ min: 1 }),
  body('approve').isBoolean(),
  body('notes').optional().isLength({ max: 500 })
];

export async function resolveProfessorSupplement(req, res) {
  const requestId = Number(req.params.requestId);
  const { approve, notes } = req.body;

  const { rows } = await query(
    `SELECT psr.*, c.tokens_per_student, c.vps_per_student,
            (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = psr.course_id) AS students
     FROM professor_supplement_requests psr
     JOIN courses c ON c.id = psr.course_id
     WHERE psr.id = $1`,
    [requestId]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  const request = rows[0];
  if (request.status !== 'pending') {
    return res.status(400).json({ message: 'Request already resolved.' });
  }

  let status = 'rejected';
  if (approve) {
    const totalBaseTokens = Number(request.students) * Number(request.tokens_per_student);
    const totalBaseVps = Number(request.students) * Number(request.vps_per_student);
    const extraTokens = Math.ceil(totalBaseTokens * 0.1);
    const extraVps = Math.ceil(totalBaseVps * 0.1);

    await query(
      `INSERT INTO course_allocations (course_id, professor_extra_tokens, professor_extra_vps, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (course_id) DO UPDATE
       SET professor_extra_tokens = EXCLUDED.professor_extra_tokens,
           professor_extra_vps = EXCLUDED.professor_extra_vps,
           updated_at = NOW()`,
      [request.course_id, extraTokens, extraVps]
    );
    status = 'approved';
  }

  await query(
    'UPDATE professor_supplement_requests SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3',
    [status, notes || null, requestId]
  );

  await logAction({
    user: req.user,
    actionType: 'professor_supplement_resolved',
    actionDetails: `Supplement request ${requestId} ${status}`,
    ipAddress: req.ip
  });

  return res.json({ message: `Request ${status}.` });
}

export async function listAdminPendingResourceRequests(req, res) {
  const { rows } = await query(
    `SELECT rr.*, s.email AS student_email, c.title AS course_title
     FROM resource_requests rr
     JOIN users s ON s.id = rr.student_id
     JOIN courses c ON c.id = rr.course_id
     WHERE rr.status = 'pending_admin'
     ORDER BY rr.created_at DESC`
  );

  return res.json({ requests: rows });
}

export const resolveAdminResourceRequestValidation = [
  param('requestId').isInt({ min: 1 }),
  body('approve').isBoolean(),
  body('feedback').optional().isLength({ max: 500 })
];

export async function resolveAdminResourceRequest(req, res) {
  const requestId = Number(req.params.requestId);
  const { approve, feedback } = req.body;

  const { rows } = await query('SELECT * FROM resource_requests WHERE id = $1', [requestId]);
  if (!rows.length) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  const request = rows[0];
  if (request.status !== 'pending_admin') {
    return res.status(400).json({ message: 'Request not pending admin.' });
  }

  let newStatus = 'rejected';
  if (approve) {
    await addResourceToStudent(request.course_id, request.student_id, request.resource_type, request.quantity);
    newStatus = 'approved';
  }

  await query(
    'UPDATE resource_requests SET status = $1, admin_notes = $2, updated_at = NOW() WHERE id = $3',
    [newStatus, feedback || null, requestId]
  );

  await logAction({
    user: req.user,
    actionType: 'student_resource_request_admin_resolved',
    actionDetails: `Request ${requestId} ${newStatus}`,
    ipAddress: req.ip
  });

  return res.json({ message: `Request ${newStatus}.` });
}

export const sendVpsCredentialsValidation = [
  param('courseId').isInt({ min: 1 }),
  body('ipAddress').trim().isLength({ min: 3, max: 120 }),
  body('username').trim().isLength({ min: 1, max: 120 }),
  body('password').trim().isLength({ min: 1, max: 120 })
];

export async function sendVpsCredentials(req, res) {
  const courseId = Number(req.params.courseId);
  const { ipAddress, username, password } = req.body;

  await query(
    `INSERT INTO vps_credentials (course_id, ip_address, username, password, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (course_id) DO UPDATE
     SET ip_address = EXCLUDED.ip_address,
         username = EXCLUDED.username,
         password = EXCLUDED.password,
         updated_at = NOW()`,
    [courseId, ipAddress, username, password]
  );

  const { rows: students } = await query(
    `SELECT u.email
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     WHERE e.course_id = $1`,
    [courseId]
  );

  const mailer = getMailer();
  const sentTo = [];

  if (mailer) {
    for (const student of students) {
      await mailer.sendMail({
        from: env.smtpFrom,
        to: student.email,
        subject: `UniVault VPS credentials for course #${courseId}`,
        text: `IP: ${ipAddress}\nUsername: ${username}\nPassword: ${password}`
      });
      sentTo.push(student.email);
    }
  }

  await logAction({
    user: req.user,
    actionType: 'vps_credentials_distributed',
    actionDetails: `VPS credentials distributed for course ${courseId}`,
    ipAddress: req.ip
  });

  return res.json({
    message: 'VPS credentials processed.',
    recipients: students.map((s) => s.email),
    emailSent: Boolean(mailer),
    emailSentTo: sentTo
  });
}

export const auditFilterValidation = [
  queryValidator('from').optional().isISO8601(),
  queryValidator('to').optional().isISO8601(),
  queryValidator('role').optional().isIn(['administrator', 'profesor', 'student', 'audit']),
  queryValidator('action').optional().isLength({ min: 1, max: 120 }),
  queryValidator('page').optional().isInt({ min: 1 }),
  queryValidator('pageSize').optional().isInt({ min: 1, max: 100 })
];

export async function getAuditLogs(req, res) {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 20);
  const offset = (page - 1) * pageSize;

  const filters = [];
  const params = [];

  if (req.query.from) {
    params.push(req.query.from);
    filters.push(`timestamp >= $${params.length}`);
  }
  if (req.query.to) {
    params.push(req.query.to);
    filters.push(`timestamp <= $${params.length}`);
  }
  if (req.query.role) {
    params.push(req.query.role);
    filters.push(`user_role = $${params.length}::user_role`);
  }
  if (req.query.action) {
    params.push(`%${req.query.action}%`);
    filters.push(`action_type ILIKE $${params.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*)::int AS total FROM audit_logs ${whereClause}`, params);

  params.push(pageSize, offset);

  const listResult = await query(
    `SELECT id, timestamp, user_email, user_role, action_type, action_details, ip_address
     FROM audit_logs
     ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return res.json({
    logs: listResult.rows,
    total: countResult.rows[0].total,
    page,
    pageSize
  });
}
