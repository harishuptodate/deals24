import express from 'express';
import * as adminController from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = express.Router();

router.post('/deals', requireAdminAuth, adminController.postDeal);
router.get('/blacklist', requireAdminAuth, adminController.getBlacklist);
router.post('/blacklist/rules', requireAdminAuth, adminController.saveBlacklistRule);
router.delete('/blacklist/rules/:id', requireAdminAuth, adminController.deleteBlacklistRule);
router.post('/blacklist', requireAdminAuth, adminController.addBlacklist);
router.delete('/blacklist/:id', requireAdminAuth, adminController.deleteBlacklist);
router.post('/auth/login', adminController.login);
router.get('/logs', requireAdminAuth, adminController.getLogs);
router.get('/logs/stream', requireAdminAuth, adminController.streamLogs);

export default router;
