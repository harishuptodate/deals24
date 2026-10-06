import express, { type RequestHandler } from 'express';
import * as wishlistController from '../controllers/wishlistController';

const router = express.Router();
const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

router.get('/', asyncRoute(wishlistController.listWishlist));
router.post('/', asyncRoute(wishlistController.addWishlistItem));
router.post('/import', asyncRoute(wishlistController.importWishlist));
router.delete('/:dealId', asyncRoute(wishlistController.removeWishlistItem));
router.delete('/', asyncRoute(wishlistController.clearWishlist));

export default router;
