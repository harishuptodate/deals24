import type { Request, Response } from 'express';
import {
  fetchProductImage as fetchAmazonProductImage,
  getStoredProducts as getAmazonStoredProducts,
} from '../services/amazonService';
import { redis } from '../services/redisClient';

type FetchProductImageRequest = Request<unknown, unknown, { url?: string }>;
type DownloadImageRequest = Request<{ fileId: string }>;

function setImageHeaders(res: Response, fileId: string, filename: string) {
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', `"${fileId}"`);
  const nowInKolkata = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  res.setHeader('Last-Modified', nowInKolkata.toUTCString());
  res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
}

export const downloadTelegramImage = async (req: DownloadImageRequest, res: Response) => {
  const { fileId } = req.params;
  const redisKey = `tg-image:${fileId}`;
  const etag = `"${fileId}"`;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) return res.status(500).json({ error: 'Telegram bot token not configured' });
  if (req.headers['if-none-match'] === etag) return res.status(304).end();

  try {
    const base64Data = await redis.get(redisKey);
    if (base64Data) {
      setImageHeaders(res, fileId, `${fileId}.jpg`);
      return res.send(Buffer.from(base64Data, 'base64'));
    }

    const infoResponse = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`,
    );
    const infoData = await infoResponse.json();
    if (!infoData.ok || !infoData.result?.file_path) {
      return res.status(404).json({ error: 'File not found' });
    }

    const filePath = infoData.result.file_path;
    const imageResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    if (!imageResponse.ok) return res.status(404).json({ error: 'Failed to download image' });

    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    await redis.set(redisKey, buffer.toString('base64'), 'EX', 86400);
    setImageHeaders(res, fileId, filePath.split('/').pop() || `${fileId}.jpg`);
    return res.send(buffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    return res.status(500).json({ error: 'Image download failed' });
  }
};

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
