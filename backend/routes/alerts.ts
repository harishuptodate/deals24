import express, { type RequestHandler } from 'express';
import * as alertController from '../controllers/alertController';

const router = express.Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.get('/', asyncRoute(alertController.listAlerts));
router.post('/', asyncRoute(alertController.createAlert));
router.patch('/:id', asyncRoute(alertController.updateAlert));
router.delete('/:id', asyncRoute(alertController.deleteAlert));
router.get('/unsubscribe/:token', asyncRoute(alertController.unsubscribeAlert));

export default router;
