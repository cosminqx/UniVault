import { Router } from 'express';
import { authRequired, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { auditFilterValidation, getAuditLogs } from '../controllers/auditController.js';

const router = Router();

router.use(authRequired, requireRole('audit'));
router.get('/logs', auditFilterValidation, validateRequest, getAuditLogs);

export default router;
