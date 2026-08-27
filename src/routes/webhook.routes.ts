import { Router } from 'express';
import { handleShopifyWebhook } from '../webhooks/shopify.webhook';
import { handleRazorpayWebhook } from '../webhooks/razorpay.webhook';
import { verifyMetaWebhook, handleMetaWebhook } from '../webhooks/meta.webhook';

export const webhookRouter = Router();

// Shopify Webhooks
webhookRouter.post('/shopify', handleShopifyWebhook);

// Razorpay Webhooks
webhookRouter.post('/razorpay', handleRazorpayWebhook);

// Meta / WhatsApp / Instagram Webhooks
webhookRouter.get('/meta', verifyMetaWebhook);
webhookRouter.post('/meta', handleMetaWebhook);
