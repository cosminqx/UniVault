import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  courseStatsValidation,
  getCourseStats,
  getStudentStats,
  getStudentsAndCourses,
  getUniversityStats,
  studentStatsValidation
} from '../controllers/statsController.js';

const router = Router();

router.use(authRequired, requireRole('administrator'));

router.get('/selectors', getStudentsAndCourses);
router.get('/student/:studentId', studentStatsValidation, validateRequest, getStudentStats);
router.get('/course/:courseId', courseStatsValidation, validateRequest, getCourseStats);
router.get('/university', getUniversityStats);

export default router;
