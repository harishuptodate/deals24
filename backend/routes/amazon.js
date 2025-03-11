
const express = require('express');
const router = express.Router();
const amazonController = require('../controllers/amazonController');

// Route to get product image by Amazon URL
router.get('/image', amazonController.getProductImage);

// Route to get product details by Amazon URL
router.get('/details', amazonController.getProductDetails);

module.exports = router;
