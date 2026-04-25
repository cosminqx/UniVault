import { query, param } from 'express-validator';
import { query as dbQuery } from '../config/db.js';

export async function getStudentsAndCourses(req, res) {
  const [studentsResult, coursesResult] = await Promise.all([
    dbQuery("SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name"),
    dbQuery('SELECT id, title FROM courses ORDER BY title')
  ]);

  return res.json({ students: studentsResult.rows, courses: coursesResult.rows });
}

export const studentStatsValidation = [param('studentId').isInt({ min: 1 })];

export async function getStudentStats(req, res) {
  const studentId = Number(req.params.studentId);

  const [resourceResult, consumptionByActivityResult, totalConsumedResult, vpsUsedResult] = await Promise.all([
    dbQuery(
      `SELECT COALESCE(SUM(allocated_tokens), 0)::int AS allocated_tokens,
              COALESCE(SUM(allocated_vps), 0)::int AS allocated_vps
       FROM student_course_resources WHERE student_id = $1`,
      [studentId]
    ),
    dbQuery(
      `SELECT a.name AS activity, COALESCE(SUM(tc.repetitions), 0)::int AS repetitions,
              COALESCE(SUM(tc.tokens_spent), 0)::int AS tokens_consumed
       FROM token_consumptions tc
       JOIN activities a ON a.id = tc.activity_id
       WHERE tc.student_id = $1
       GROUP BY a.name
       ORDER BY tokens_consumed DESC`,
      [studentId]
    ),
    dbQuery('SELECT COALESCE(SUM(tokens_spent), 0)::int AS total_consumed FROM token_consumptions WHERE student_id = $1', [studentId]),
    dbQuery('SELECT COUNT(*)::int AS vps_used FROM vps_validations WHERE student_id = $1', [studentId])
  ]);

  return res.json({
    allocatedTokens: resourceResult.rows[0].allocated_tokens,
    allocatedVps: resourceResult.rows[0].allocated_vps,
    activityConsumption: consumptionByActivityResult.rows,
    totalTokensConsumed: totalConsumedResult.rows[0].total_consumed,
    usedVps: vpsUsedResult.rows[0].vps_used
  });
}

export const courseStatsValidation = [param('courseId').isInt({ min: 1 })];

export async function getCourseStats(req, res) {
  const courseId = Number(req.params.courseId);

  const [allocationResult, consumptionResult, totalResult, vpsResult] = await Promise.all([
    dbQuery(
      `SELECT COALESCE(allocated_tokens, 0)::int AS allocated_tokens,
              COALESCE(allocated_vps, 0)::int AS allocated_vps
       FROM course_allocations WHERE course_id = $1`,
      [courseId]
    ),
    dbQuery(
      `SELECT a.name AS activity,
              COALESCE(SUM(tc.repetitions), 0)::int AS repetitions,
              COALESCE(SUM(tc.tokens_spent), 0)::int AS tokens_consumed
       FROM token_consumptions tc
       JOIN activities a ON a.id = tc.activity_id
       WHERE tc.course_id = $1
       GROUP BY a.name
       ORDER BY tokens_consumed DESC`,
      [courseId]
    ),
    dbQuery('SELECT COALESCE(SUM(tokens_spent), 0)::int AS total_consumed FROM token_consumptions WHERE course_id = $1', [courseId]),
    dbQuery(
      `SELECT
         (SELECT COALESCE(SUM(allocated_vps), 0)::int FROM student_course_resources WHERE course_id = $1) AS allocated_vps,
         (SELECT COUNT(*)::int FROM vps_validations WHERE course_id = $1) AS used_vps`,
      [courseId]
    )
  ]);

  return res.json({
    allocatedTokens: allocationResult.rows[0]?.allocated_tokens || 0,
    activityConsumption: consumptionResult.rows,
    totalTokensConsumed: totalResult.rows[0].total_consumed,
    allocatedVps: vpsResult.rows[0].allocated_vps,
    usedVps: vpsResult.rows[0].used_vps
  });
}

export async function getUniversityStats(req, res) {
  const [universityTotal, totalConsumed, activityChart, topCourses, topStudents, vpsTotals] = await Promise.all([
    dbQuery('SELECT total_tokens, total_vps FROM university_resources WHERE id = 1'),
    dbQuery('SELECT COALESCE(SUM(tokens_spent), 0)::int AS total_consumed FROM token_consumptions'),
    dbQuery(
      `SELECT a.name AS activity, COALESCE(SUM(tc.tokens_spent), 0)::int AS tokens_consumed
       FROM token_consumptions tc
       JOIN activities a ON a.id = tc.activity_id
       GROUP BY a.name
       ORDER BY tokens_consumed DESC`
    ),
    dbQuery(
      `SELECT c.id, c.title, COALESCE(SUM(tc.tokens_spent), 0)::int AS consumed
       FROM courses c
       LEFT JOIN token_consumptions tc ON tc.course_id = c.id
       GROUP BY c.id
       ORDER BY consumed DESC
       LIMIT 5`
    ),
    dbQuery(
      `SELECT u.id, u.name, u.email, COALESCE(SUM(tc.tokens_spent), 0)::int AS consumed
       FROM users u
       LEFT JOIN token_consumptions tc ON tc.student_id = u.id
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY consumed DESC
       LIMIT 5`
    ),
    dbQuery(
      `SELECT
         (SELECT COALESCE(SUM(allocated_vps), 0)::int FROM student_course_resources) AS allocated_vps,
         (SELECT COUNT(*)::int FROM vps_validations) AS used_vps`
    )
  ]);

  return res.json({
    totalUniversityTokens: universityTotal.rows[0].total_tokens,
    totalUniversityVps: universityTotal.rows[0].total_vps,
    totalTokensConsumed: totalConsumed.rows[0].total_consumed,
    activityChart: activityChart.rows,
    topCourses: topCourses.rows,
    topStudents: topStudents.rows,
    allocatedVps: vpsTotals.rows[0].allocated_vps,
    usedVps: vpsTotals.rows[0].used_vps
  });
}
