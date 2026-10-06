import express, { type RequestHandler } from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.post('/magic-link', asyncRoute(authController.requestMagicLink));
router.post('/verify', asyncRoute(authController.verifyMagicLink));
router.get('/me', asyncRoute(authController.currentUser));
router.post('/logout', asyncRoute(authController.logout));

export default router;
