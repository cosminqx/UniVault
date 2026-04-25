import fetch from 'node-fetch';
import { body, param } from 'express-validator';
import { query } from '../config/db.js';
import { logAction } from '../utils/audit.js';
import { assignmentUpload } from '../utils/upload.js';
import { ensureStudentCourseResource, getStudentCourseBalance } from '../services/resourceService.js';

export const uploadAssignment = assignmentUpload.single('file');

export async function getAllCourses(req, res) {
  const studentId = req.user.id;

  const { rows } = await query(
    `SELECT c.id, c.title, c.description, c.max_students, c.tokens_per_student, c.vps_per_student,
            u.name AS professor_name, u.email AS professor_email,
            COUNT(e.id)::int AS enrolled_count,
            (c.max_students - COUNT(e.id)::int) AS available_spots,
            EXISTS (
              SELECT 1 FROM enrollments e2 WHERE e2.course_id = c.id AND e2.student_id = $1
            ) AS is_enrolled,
            COALESCE((SELECT COUNT(*)::int FROM course_materials cm WHERE cm.course_id = c.id), 0) AS materials_count
     FROM courses c
     JOIN users u ON u.id = c.professor_id
     LEFT JOIN enrollments e ON e.course_id = c.id
     GROUP BY c.id, u.id
     ORDER BY c.created_at DESC`,
    [studentId]
  );

  const enrolled = rows.filter((c) => c.is_enrolled);
  const allCourses = rows;

  return res.json({ allCourses, enrolledCourses: enrolled });
}

export const enrollValidation = [param('courseId').isInt({ min: 1 })];

export async function enrollCourse(req, res) {
  const courseId = Number(req.params.courseId);
  const studentId = req.user.id;

  const { rows: courseRows } = await query(
    `SELECT c.*,
            (SELECT COUNT(*)::int FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
     FROM courses c
     WHERE c.id = $1`,
    [courseId]
  );

  if (!courseRows.length) {
    return res.status(404).json({ message: 'Course not found.' });
  }

  const course = courseRows[0];
  if (Number(course.enrolled_count) >= Number(course.max_students)) {
    return res.status(400).json({ message: 'No spots available.' });
  }

  const existing = await query('SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2', [courseId, studentId]);
  if (existing.rows.length) {
    return res.status(400).json({ message: 'Already enrolled.' });
  }

  await query('INSERT INTO enrollments (course_id, student_id) VALUES ($1, $2)', [courseId, studentId]);
  await ensureStudentCourseResource(courseId, studentId);

  await logAction({
    user: req.user,
    actionType: 'course_enrolled',
    actionDetails: `Student enrolled in course ${course.title}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Enrollment successful.' });
}

export const courseAccessValidation = [param('courseId').isInt({ min: 1 })];

async function ensureStudentEnrolled(courseId, studentId) {
  const { rows } = await query('SELECT id FROM enrollments WHERE course_id = $1 AND student_id = $2', [courseId, studentId]);
  if (!rows.length) {
    const error = new Error('You are not enrolled in this course.');
    error.status = 403;
    throw error;
  }
}

export async function getCourseDetails(req, res) {
  const courseId = Number(req.params.courseId);
  const isAdmin = req.user.role === 'administrator';

  if (!isAdmin) {
    await ensureStudentEnrolled(courseId, req.user.id);
  }

  const { rows: courseRows } = await query(
    `SELECT c.*, u.name AS professor_name, u.email AS professor_email
     FROM courses c
     JOIN users u ON u.id = c.professor_id
     WHERE c.id = $1`,
    [courseId]
  );

  const { rows: materials } = await query(
    'SELECT id, file_name, file_path, mime_type, size_bytes, uploaded_at FROM course_materials WHERE course_id = $1 ORDER BY uploaded_at DESC',
    [courseId]
  );

  const { rows: assignments } = await query(
    'SELECT id, file_name, file_path, mime_type, size_bytes, uploaded_at FROM assignments WHERE course_id = $1 AND student_id = $2 ORDER BY uploaded_at DESC',
    [courseId, req.user.id]
  );

  const balance = isAdmin
    ? {
        allocatedTokens: Number(courseRows[0]?.tokens_per_student || 0),
        usedTokens: 0,
        remainingTokens: Number(courseRows[0]?.tokens_per_student || 0),
        allocatedVps: Number(courseRows[0]?.vps_per_student || 0),
        usedVps: 0,
        remainingVps: Number(courseRows[0]?.vps_per_student || 0)
      }
    : await getStudentCourseBalance(courseId, req.user.id);

  return res.json({
    course: courseRows[0],
    materials,
    assignments: isAdmin ? [] : assignments,
    resources: balance
  });
}

export const uploadAssignmentValidation = [param('courseId').isInt({ min: 1 })];

export async function addAssignment(req, res) {
  const courseId = Number(req.params.courseId);
  await ensureStudentEnrolled(courseId, req.user.id);

  if (!req.file) {
    return res.status(400).json({ message: 'File is required.' });
  }

  const relativePath = `assignments/${req.file.filename}`;

  const { rows } = await query(
    `INSERT INTO assignments (course_id, student_id, file_name, file_path, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [courseId, req.user.id, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
  );

  await logAction({
    user: req.user,
    actionType: 'assignment_uploaded',
    actionDetails: `Student uploaded assignment in course ${courseId}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Assignment uploaded.', assignment: rows[0] });
}

export async function listActivities(req, res) {
  const { rows } = await query('SELECT id, name, token_cost FROM activities WHERE is_active = TRUE ORDER BY id');
  return res.json({ activities: rows });
}

export const consumeTokensValidation = [
  param('courseId').isInt({ min: 1 }),
  body('items').isArray({ min: 1 }),
  body('items.*.activityId').isInt({ min: 1 }),
  body('items.*.repetitions').isInt({ min: 1 })
];

export async function consumeTokens(req, res) {
  const courseId = Number(req.params.courseId);
  const studentId = req.user.id;
  await ensureStudentEnrolled(courseId, studentId);

  const activityIds = req.body.items.map((i) => i.activityId);
  const { rows: activityRows } = await query(
    'SELECT id, name, token_cost FROM activities WHERE id = ANY($1::int[]) AND is_active = TRUE',
    [activityIds]
  );

  if (activityRows.length !== activityIds.length) {
    return res.status(400).json({ message: 'One or more activities are invalid.' });
  }

  const map = new Map(activityRows.map((a) => [a.id, a]));
  let totalTokens = 0;
  const consumptionDetails = [];

  for (const item of req.body.items) {
    const activity = map.get(item.activityId);
    const tokens = Number(activity.token_cost) * Number(item.repetitions);
    totalTokens += tokens;
    consumptionDetails.push({
      activityId: activity.id,
      name: activity.name,
      repetitions: Number(item.repetitions),
      tokenCost: Number(activity.token_cost),
      tokens
    });
  }

  const balance = await getStudentCourseBalance(courseId, studentId);
  if (totalTokens > balance.remainingTokens) {
    return res.status(400).json({
      message: 'Not enough tokens available.',
      required: totalTokens,
      remaining: balance.remainingTokens
    });
  }

  for (const c of consumptionDetails) {
    await query(
      `INSERT INTO token_consumptions (course_id, student_id, activity_id, repetitions, tokens_spent)
       VALUES ($1, $2, $3, $4, $5)`,
      [courseId, studentId, c.activityId, c.repetitions, c.tokens]
    );
  }

  await logAction({
    user: req.user,
    actionType: 'token_consumed',
    actionDetails: `Consumed ${totalTokens} tokens in course ${courseId}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Token consumption recorded.', totalTokens, consumptionDetails });
}

export const validateVpsValidation = [
  param('courseId').isInt({ min: 1 }),
  body('username').trim().isLength({ min: 1 }),
  body('password').trim().isLength({ min: 1 }),
  body('ip').trim().isLength({ min: 3 })
];

export async function validateVps(req, res) {
  const courseId = Number(req.params.courseId);
  const studentId = req.user.id;
  await ensureStudentEnrolled(courseId, studentId);

  const balance = await getStudentCourseBalance(courseId, studentId);
  if (balance.remainingVps <= 0) {
    return res.status(400).json({ message: 'No VPS subscriptions remaining for validation.' });
  }

  const payload = {
    username: req.body.username,
    password: req.body.password,
    ip: req.body.ip
  };

  const response = await fetch('https://httpbin.org/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const responseBody = await response.json();

  await query(
    `INSERT INTO vps_validations (course_id, student_id, request_payload, response_payload)
     VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
    [courseId, studentId, JSON.stringify(payload), JSON.stringify(responseBody)]
  );

  await logAction({
    user: req.user,
    actionType: 'vps_validated',
    actionDetails: `VPS validated in course ${courseId}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'VPS validation successful.', apiResponse: responseBody });
}

export const requestExtraValidation = [
  param('courseId').isInt({ min: 1 }),
  body('resourceType').isIn(['tokens', 'vps']),
  body('quantity').isInt({ min: 1 }),
  body('reason').trim().isLength({ min: 5, max: 2000 })
];

export async function requestExtraResources(req, res) {
  const courseId = Number(req.params.courseId);
  const studentId = req.user.id;

  const { rows: enrollmentRows } = await query(
    `SELECT c.professor_id
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.course_id = $1 AND e.student_id = $2`,
    [courseId, studentId]
  );

  if (!enrollmentRows.length) {
    return res.status(403).json({ message: 'Not enrolled in course.' });
  }

  const professorId = enrollmentRows[0].professor_id;

  const { rows: existingPendingRows } = await query(
    `SELECT id
     FROM resource_requests
     WHERE student_id = $1
       AND course_id = $2
       AND resource_type = $3::resource_type
       AND status IN ('pending_professor', 'pending_admin')
     ORDER BY created_at DESC
     LIMIT 1`,
    [studentId, courseId, req.body.resourceType]
  );

  if (existingPendingRows.length) {
    return res.status(409).json({
      message: 'Ai deja o solicitare in asteptare pentru acest tip de resursa la cursul curent.'
    });
  }

  const { rows } = await query(
    `INSERT INTO resource_requests (student_id, professor_id, course_id, resource_type, quantity, reason, status)
     VALUES ($1, $2, $3, $4::resource_type, $5, $6, 'pending_professor')
     RETURNING *`,
    [studentId, professorId, courseId, req.body.resourceType, req.body.quantity, req.body.reason]
  );

  await logAction({
    user: req.user,
    actionType: 'extra_resources_requested',
    actionDetails: `Student requested ${req.body.quantity} ${req.body.resourceType} in course ${courseId}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Request submitted.', request: rows[0] });
}

export async function myExtraRequests(req, res) {
  const { rows } = await query(
    `SELECT rr.*, c.title AS course_title
     FROM resource_requests rr
     JOIN courses c ON c.id = rr.course_id
     WHERE rr.student_id = $1
     ORDER BY rr.created_at DESC`,
    [req.user.id]
  );
  return res.json({ requests: rows });
}
