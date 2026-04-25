import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  addMaterial,
  createCourse,
  createCourseValidation,
  getStudentAssignments,
  getStudentAssignmentsValidation,
  listProfessorCourses,
  listStudentRequestsForProfessor,
  requestProfessorSupplement,
  requestSupplementValidation,
  resolveStudentRequest,
  resolveStudentRequestValidation,
  uploadMaterial,
  uploadMaterialValidation
} from '../controllers/professorController.js';

const router = Router();

router.use(authRequired, requireRole('profesor'));

router.post('/courses', createCourseValidation, validateRequest, createCourse);
router.get('/courses', listProfessorCourses);
router.post('/courses/:courseId/materials', uploadMaterial, uploadMaterialValidation, validateRequest, addMaterial);
router.get('/courses/:courseId/student-assignments', getStudentAssignmentsValidation, validateRequest, getStudentAssignments);

router.post('/courses/:courseId/supplement-request', requestSupplementValidation, validateRequest, requestProfessorSupplement);

router.get('/requests/student-extras', listStudentRequestsForProfessor);
router.post('/requests/:requestId/resolve', resolveStudentRequestValidation, validateRequest, resolveStudentRequest);

export default router;
