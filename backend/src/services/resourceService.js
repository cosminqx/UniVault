import { query } from '../config/db.js';

export async function ensureStudentCourseResource(courseId, studentId) {
  const { rows: courseRows } = await query(
    'SELECT tokens_per_student, vps_per_student FROM courses WHERE id = $1',
    [courseId]
  );

  if (!courseRows.length) {
    throw new Error('Course not found.');
  }

  const course = courseRows[0];

  const { rows } = await query(
    `INSERT INTO student_course_resources (course_id, student_id, allocated_tokens, allocated_vps)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, student_id) DO UPDATE
     SET updated_at = NOW()
     RETURNING *`,
    [courseId, studentId, course.tokens_per_student, course.vps_per_student]
  );

  return rows[0];
}

export async function getStudentCourseBalance(courseId, studentId) {
  await ensureStudentCourseResource(courseId, studentId);

  const { rows: resourceRows } = await query(
    'SELECT allocated_tokens, allocated_vps FROM student_course_resources WHERE course_id = $1 AND student_id = $2',
    [courseId, studentId]
  );

  const { rows: usageRows } = await query(
    `SELECT COALESCE(SUM(tokens_spent), 0) AS used_tokens
     FROM token_consumptions
     WHERE course_id = $1 AND student_id = $2`,
    [courseId, studentId]
  );

  const { rows: vpsRows } = await query(
    `SELECT COUNT(*)::int AS used_vps
     FROM vps_validations
     WHERE course_id = $1 AND student_id = $2`,
    [courseId, studentId]
  );

  const allocatedTokens = Number(resourceRows[0].allocated_tokens);
  const allocatedVps = Number(resourceRows[0].allocated_vps);
  const usedTokens = Number(usageRows[0].used_tokens);
  const usedVps = Number(vpsRows[0].used_vps);

  return {
    allocatedTokens,
    usedTokens,
    remainingTokens: allocatedTokens - usedTokens,
    allocatedVps,
    usedVps,
    remainingVps: allocatedVps - usedVps
  };
}

export async function addResourceToStudent(courseId, studentId, resourceType, quantity) {
  const tokenInc = resourceType === 'tokens' ? quantity : 0;
  const vpsInc = resourceType === 'vps' ? quantity : 0;

  await ensureStudentCourseResource(courseId, studentId);

  const { rows } = await query(
    `UPDATE student_course_resources
     SET allocated_tokens = allocated_tokens + $1,
         allocated_vps = allocated_vps + $2,
         updated_at = NOW()
     WHERE course_id = $3 AND student_id = $4
     RETURNING *`,
    [tokenInc, vpsInc, courseId, studentId]
  );

  return rows[0];
}

export async function getProfessorExtraBudget(courseId) {
  const { rows: allocRows } = await query(
    'SELECT professor_extra_tokens, professor_extra_vps FROM course_allocations WHERE course_id = $1',
    [courseId]
  );

  if (!allocRows.length) {
    return { tokens: 0, vps: 0 };
  }

  return {
    tokens: Number(allocRows[0].professor_extra_tokens),
    vps: Number(allocRows[0].professor_extra_vps)
  };
}

export async function getProfessorApprovedExtraUsed(courseId, resourceType) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(quantity), 0)::int AS used
     FROM resource_requests
     WHERE course_id = $1 AND resource_type = $2::resource_type AND status = 'approved'`,
    [courseId, resourceType]
  );

  return Number(rows[0].used);
}
