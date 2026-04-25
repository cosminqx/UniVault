import { body, param } from 'express-validator';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/db.js';
import { logAction } from '../utils/audit.js';
import { materialUpload } from '../utils/upload.js';
import { addResourceToStudent, getProfessorApprovedExtraUsed, getProfessorExtraBudget } from '../services/resourceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadMaterial = materialUpload.single('file');

export const createCourseValidation = [
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('description').trim().isLength({ min: 10, max: 5000 }),
  body('maxStudents').isInt({ min: 1 }),
  body('tokensPerStudent').isInt({ min: 0 }),
  body('vpsPerStudent').isInt({ min: 0 })
];

export async function createCourse(req, res) {
  const { title, description, maxStudents, tokensPerStudent, vpsPerStudent } = req.body;

  const { rows } = await query(
    `INSERT INTO courses (title, description, max_students, professor_id, tokens_per_student, vps_per_student)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [title, description, maxStudents, req.user.id, tokensPerStudent, vpsPerStudent]
  );

  await query(
    `INSERT INTO course_allocations (course_id, allocated_tokens, allocated_vps)
     VALUES ($1, 0, 0)
     ON CONFLICT (course_id) DO NOTHING`,
    [rows[0].id]
  );

  await logAction({
    user: req.user,
    actionType: 'course_created',
    actionDetails: `Professor created course ${rows[0].title}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Course created.', course: rows[0] });
}

export async function listProfessorCourses(req, res) {
  const { rows } = await query(
    `SELECT c.*, COUNT(e.id)::int AS enrolled_students,
            COALESCE(ca.allocated_tokens, 0) AS allocated_tokens,
            COALESCE(ca.allocated_vps, 0) AS allocated_vps,
            COALESCE(ca.distribution_confirmed, FALSE) AS distribution_confirmed,
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'id', cm.id,
                  'file_name', cm.file_name,
                  'file_path', cm.file_path,
                  'uploaded_at', cm.uploaded_at
                )
              ) FILTER (WHERE cm.id IS NOT NULL),
              '[]'::json
            ) AS materials
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     LEFT JOIN course_allocations ca ON ca.course_id = c.id
     LEFT JOIN course_materials cm ON cm.course_id = c.id
     WHERE c.professor_id = $1
     GROUP BY c.id, ca.id
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );

  return res.json({ courses: rows });
}

export const professorCourseAccessValidation = [param('courseId').isInt({ min: 1 })];

export async function getProfessorCourseDetails(req, res) {
  const courseId = Number(req.params.courseId);

  const { rows: courseRows } = await query(
    `SELECT c.*, COUNT(DISTINCT e.id)::int AS enrolled_students,
            COALESCE(ca.allocated_tokens, 0) AS allocated_tokens,
            COALESCE(ca.allocated_vps, 0) AS allocated_vps,
            COALESCE(ca.professor_extra_tokens, 0) AS professor_extra_tokens,
            COALESCE(ca.professor_extra_vps, 0) AS professor_extra_vps,
            COALESCE(ca.distribution_confirmed, FALSE) AS distribution_confirmed
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     LEFT JOIN course_allocations ca ON ca.course_id = c.id
     WHERE c.id = $1 AND c.professor_id = $2
     GROUP BY c.id, ca.id`,
    [courseId, req.user.id]
  );

  if (!courseRows.length) {
    return res.status(404).json({ message: 'Course not found or unauthorized.' });
  }

  const { rows: materials } = await query(
    `SELECT id, file_name, file_path, mime_type, size_bytes, uploaded_at
     FROM course_materials
     WHERE course_id = $1 AND professor_id = $2
     ORDER BY uploaded_at DESC`,
    [courseId, req.user.id]
  );

  const { rows: assignments } = await query(
    `SELECT a.id, a.file_name, a.file_path, a.mime_type, a.size_bytes, a.uploaded_at, u.name AS student_name, u.email AS student_email
     FROM assignments a
     JOIN users u ON u.id = a.student_id
     JOIN courses c ON c.id = a.course_id
     WHERE a.course_id = $1 AND c.professor_id = $2
     ORDER BY a.uploaded_at DESC`,
    [courseId, req.user.id]
  );

  const { rows: students } = await query(
    `SELECT u.id, u.name, u.email, e.enrolled_at
     FROM enrollments e
     JOIN users u ON u.id = e.student_id
     JOIN courses c ON c.id = e.course_id
     WHERE e.course_id = $1 AND c.professor_id = $2
     ORDER BY e.enrolled_at DESC`,
    [courseId, req.user.id]
  );

  return res.json({
    course: courseRows[0],
    materials,
    assignments,
    students
  });
}

export const uploadMaterialValidation = [param('courseId').isInt({ min: 1 })];

export async function addMaterial(req, res) {
  const courseId = Number(req.params.courseId);

  if (!req.file) {
    return res.status(400).json({ message: 'File is required.' });
  }

  const { rows: courseRows } = await query('SELECT id, title FROM courses WHERE id = $1 AND professor_id = $2', [
    courseId,
    req.user.id
  ]);

  if (!courseRows.length) {
    return res.status(404).json({ message: 'Course not found or unauthorized.' });
  }

  const relativePath = `materials/${req.file.filename}`;
  const { rows } = await query(
    `INSERT INTO course_materials (course_id, professor_id, file_name, file_path, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [courseId, req.user.id, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
  );

  await logAction({
    user: req.user,
    actionType: 'course_material_uploaded',
    actionDetails: `Material uploaded for course ${courseRows[0].title}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Material uploaded.', material: rows[0] });
}

export const deleteMaterialValidation = [
  param('courseId').isInt({ min: 1 }),
  param('materialId').isInt({ min: 1 })
];

export async function deleteMaterial(req, res) {
  const courseId = Number(req.params.courseId);
  const materialId = Number(req.params.materialId);

  const { rows } = await query(
    `DELETE FROM course_materials
     WHERE id = $1 AND course_id = $2 AND professor_id = $3
     RETURNING id, file_name, file_path`,
    [materialId, courseId, req.user.id]
  );

  if (!rows.length) {
    return res.status(404).json({ message: 'Material not found or unauthorized.' });
  }

  const absolutePath = path.resolve(__dirname, '../uploads', rows[0].file_path);
  await fs.unlink(absolutePath).catch(() => {});

  await logAction({
    user: req.user,
    actionType: 'course_material_deleted',
    actionDetails: `Material ${rows[0].file_name} deleted from course ${courseId}`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Material deleted.', material: rows[0] });
}

export const requestSupplementValidation = [param('courseId').isInt({ min: 1 }), body('notes').optional().isLength({ max: 500 })];

export async function requestProfessorSupplement(req, res) {
  const courseId = Number(req.params.courseId);

  const { rows: courseRows } = await query('SELECT id FROM courses WHERE id = $1 AND professor_id = $2', [courseId, req.user.id]);
  if (!courseRows.length) {
    return res.status(404).json({ message: 'Course not found or unauthorized.' });
  }

  const existing = await query(
    `SELECT id FROM professor_supplement_requests
     WHERE course_id = $1 AND professor_id = $2 AND status = 'pending'`,
    [courseId, req.user.id]
  );

  if (existing.rows.length) {
    return res.status(400).json({ message: 'A pending supplement request already exists.' });
  }

  await query(
    `INSERT INTO professor_supplement_requests (course_id, professor_id, status, notes)
     VALUES ($1, $2, 'pending', $3)`,
    [courseId, req.user.id, req.body.notes || null]
  );

  await logAction({
    user: req.user,
    actionType: 'professor_supplement_requested',
    actionDetails: `Professor requested supplement for course ${courseId}`,
    ipAddress: req.ip
  });

  return res.status(201).json({ message: 'Supplement request submitted.' });
}

export async function listStudentRequestsForProfessor(req, res) {
  const { rows } = await query(
    `SELECT rr.*, s.email AS student_email, c.title AS course_title
     FROM resource_requests rr
     JOIN users s ON s.id = rr.student_id
     JOIN courses c ON c.id = rr.course_id
     WHERE rr.professor_id = $1 AND rr.status = 'pending_professor'
     ORDER BY rr.created_at DESC`,
    [req.user.id]
  );

  return res.json({ requests: rows });
}

export const resolveStudentRequestValidation = [
  param('requestId').isInt({ min: 1 }),
  body('approve').isBoolean(),
  body('feedback').optional().isLength({ max: 500 })
];

export async function resolveStudentRequest(req, res) {
  const requestId = Number(req.params.requestId);
  const { approve, feedback } = req.body;

  const { rows } = await query('SELECT * FROM resource_requests WHERE id = $1 AND professor_id = $2', [requestId, req.user.id]);
  if (!rows.length) {
    return res.status(404).json({ message: 'Request not found.' });
  }

  const request = rows[0];
  if (request.status !== 'pending_professor') {
    return res.status(400).json({ message: 'Request already processed.' });
  }

  if (!approve) {
    await query(
      `UPDATE resource_requests
       SET status = 'rejected', professor_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [feedback || null, requestId]
    );
    await logAction({
      user: req.user,
      actionType: 'student_resource_request_rejected_professor',
      actionDetails: `Request ${requestId} rejected by professor`,
      ipAddress: req.ip
    });
    return res.json({ message: 'Request rejected.' });
  }

  const budget = await getProfessorExtraBudget(request.course_id);
  const used = await getProfessorApprovedExtraUsed(request.course_id, request.resource_type);
  const allowed = request.resource_type === 'tokens' ? budget.tokens : budget.vps;

  if (request.quantity + used <= allowed) {
    await addResourceToStudent(request.course_id, request.student_id, request.resource_type, request.quantity);
    await query(
      `UPDATE resource_requests
       SET status = 'approved', professor_notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [feedback || null, requestId]
    );

    await logAction({
      user: req.user,
      actionType: 'student_resource_request_approved_professor',
      actionDetails: `Request ${requestId} approved by professor`,
      ipAddress: req.ip
    });

    return res.json({ message: 'Request approved by professor.' });
  }

  await query(
    `UPDATE resource_requests
     SET status = 'pending_admin', professor_notes = $1, updated_at = NOW()
     WHERE id = $2`,
    [feedback || null, requestId]
  );

  await logAction({
    user: req.user,
    actionType: 'student_resource_request_forwarded_admin',
    actionDetails: `Request ${requestId} forwarded to admin`,
    ipAddress: req.ip
  });

  return res.json({ message: 'Request forwarded to admin (over professor 10% budget).' });
}
