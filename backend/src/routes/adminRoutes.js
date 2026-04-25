import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  approveProfessorSupplementValidation,
  calculateDistribution,
  confirmDistribution,
  confirmDistributionValidation,
  createActivity,
  createActivityValidation,
  deleteActivity,
  deleteActivityValidation,
  getResourceTotals,
  listActivities,
  listAdminPendingResourceRequests,
  listProfessorSupplementRequests,
  listUsers,
  resolveAdminResourceRequest,
  resolveAdminResourceRequestValidation,
  resolveProfessorSupplement,
  revokeRole,
  revokeRoleValidation,
  sendVpsCredentials,
  sendVpsCredentialsValidation,
  updateActivity,
  updateActivityValidation,
  updateResourceTotals,
  updateResourceTotalsValidation,
  updateUserRole,
  updateUserRoleValidation
} from '../controllers/adminController.js';

const router = Router();

router.use(authRequired, requireRole('administrator'));

router.get('/users', listUsers);
router.patch('/users/:userId/role', updateUserRoleValidation, validateRequest, updateUserRole);
router.patch('/users/:userId/revoke', revokeRoleValidation, validateRequest, revokeRole);

router.get('/activities', listActivities);
router.post('/activities', createActivityValidation, validateRequest, createActivity);
router.patch('/activities/:activityId', updateActivityValidation, validateRequest, updateActivity);
router.delete('/activities/:activityId', deleteActivityValidation, validateRequest, deleteActivity);

router.get('/resources/totals', getResourceTotals);
router.put('/resources/totals', updateResourceTotalsValidation, validateRequest, updateResourceTotals);
router.get('/resources/distribution/recommendations', calculateDistribution);
router.post('/resources/distribution/confirm', confirmDistributionValidation, validateRequest, confirmDistribution);

router.get('/supplements/professors', listProfessorSupplementRequests);
router.post('/supplements/professors/:requestId/resolve', approveProfessorSupplementValidation, validateRequest, resolveProfessorSupplement);

router.get('/requests/pending-admin', listAdminPendingResourceRequests);
router.post('/requests/:requestId/resolve', resolveAdminResourceRequestValidation, validateRequest, resolveAdminResourceRequest);

router.post('/courses/:courseId/send-vps-credentials', sendVpsCredentialsValidation, validateRequest, sendVpsCredentials);

export default router;
