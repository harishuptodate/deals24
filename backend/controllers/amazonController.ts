import type { Request, Response } from 'express';
import {
  fetchProductImage as fetchAmazonProductImage,
  getStoredProducts as getAmazonStoredProducts,
} from '../services/amazonService';

type FetchProductImageRequest = Request<unknown, unknown, { url?: string }>;

// Fetch product image from Amazon URL
export const fetchProductImage = async (req: FetchProductImageRequest, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'Amazon URL is required' });
    }

    console.log('Amazon controller: Processing URL:', url);
    const result = await fetchAmazonProductImage(url);
    
    if (result.error) {
      console.log('Amazon controller: Error occurred:', result.error);
      return res.status(400).json(result);
    }

    console.log('Amazon controller: Success, returning result:', result);
    return res.json(result);
  } catch (error) {
    console.error('Error in fetchProductImage controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get stored products
export const getStoredProducts = async (_req: Request, res: Response) => {
  try {
    const products = await getAmazonStoredProducts();
    return res.json({ products });
  } catch (error) {
    console.error('Error in getStoredProducts controller:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
