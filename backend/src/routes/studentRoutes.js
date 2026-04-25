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

router.use(authRequired, requireRole('student'));

router.get('/courses', getAllCourses);
router.post('/courses/:courseId/enroll', enrollValidation, validateRequest, enrollCourse);
router.get('/courses/:courseId', courseAccessValidation, validateRequest, getCourseDetails);

router.post('/courses/:courseId/assignments', uploadAssignment, uploadAssignmentValidation, validateRequest, addAssignment);

router.get('/activities', listActivities);
router.post('/courses/:courseId/consume', consumeTokensValidation, validateRequest, consumeTokens);

router.post('/courses/:courseId/vps/validate', validateVpsValidation, validateRequest, validateVps);

router.post('/courses/:courseId/extra-resources', requestExtraValidation, validateRequest, requestExtraResources);
router.get('/extra-requests', myExtraRequests);

export default router;
