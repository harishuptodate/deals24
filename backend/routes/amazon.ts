import express from 'express';
import * as amazonController from '../controllers/amazonController';

const router = express.Router();

router.get('/download-image/:fileId', amazonController.downloadTelegramImage);
router.post('/fetch-product-image', amazonController.fetchProductImage);
router.get('/products', amazonController.getStoredProducts);

export default router;
