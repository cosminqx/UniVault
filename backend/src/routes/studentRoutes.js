import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  addAssignment,
  consumeTokens,
  consumeTokensValidation,
  courseAccessValidation,
  enrollCourse,
  enrollValidation,
  getAllCourses,
  getCourseDetails,
  listActivities,
  myExtraRequests,
  requestExtraResources,
  requestExtraValidation,
  uploadAssignment,
  uploadAssignmentValidation,
  validateVps,
  validateVpsValidation
} from '../controllers/studentController.js';

const router = Router();

router.use(authRequired);

router.get('/courses', requireRole('student', 'administrator'), getAllCourses);
router.post('/courses/:courseId/enroll', requireRole('student'), enrollValidation, validateRequest, enrollCourse);
router.get('/courses/:courseId', requireRole('student', 'administrator'), courseAccessValidation, validateRequest, getCourseDetails);

router.post('/courses/:courseId/assignments', requireRole('student'), uploadAssignment, uploadAssignmentValidation, validateRequest, addAssignment);

router.get('/activities', requireRole('student'), listActivities);
router.post('/courses/:courseId/consume', requireRole('student'), consumeTokensValidation, validateRequest, consumeTokens);

router.post('/courses/:courseId/vps/validate', requireRole('student'), validateVpsValidation, validateRequest, validateVps);

router.post('/courses/:courseId/extra-resources', requireRole('student'), requestExtraValidation, validateRequest, requestExtraResources);
router.get('/extra-requests', requireRole('student'), myExtraRequests);

export default router;
