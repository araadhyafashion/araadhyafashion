import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { apiRouter } from './routes/api.routes';
import { webhookRouter } from './routes/webhook.routes';

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON with rawBody saved for Webhook HMAC Signature verification
app.use(
  express.json({
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Serve static merchant dashboard (robustly handle both dist and src)
import fs from 'fs';
const publicDir = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..', 'src', 'public');

app.use(express.static(publicDir));

// Health check routes
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), store: 'Araadhya Fashion' });
});

// Mount API and Webhook Routers
app.use('/api', apiRouter);
app.use('/webhooks', webhookRouter);


// Fallback payment success page
app.get('/payment-success', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Successful - Araadhya Fashion</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0F172A; color: #FFFFFF; text-align: center; }
          .card { background: #1E293B; padding: 40px; border-radius: 16px; border: 1px solid #334155; max-width: 480px; }
          h1 { color: #4ADE80; font-size: 28px; margin-bottom: 12px; }
          p { color: #94A3B8; font-size: 16px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🎉 Payment Received!</h1>
          <p>Thank you for shopping with <b>Araadhya Fashion</b>.<br/>Your order has been confirmed and we have sent your tracking details via WhatsApp!</p>
        </div>
      </body>
    </html>
  `);
});

// Root route serves dashboard
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start Server
const server = app.listen(config.port, () => {
  logger.info(`================================================================`);
  logger.info(`  👗 ARAADHYA FASHION - UNIFIED COMMERCE HUB`);
  logger.info(`  🚀 Server Running: http://localhost:${config.port}`);
  logger.info(`  🛍️  Shopify:    ${config.shopify.shopDomain || 'Not set'}`);
  logger.info(`  💳 Razorpay:   ${config.razorpay.keyId ? 'Configured' : 'Mock Mode'}`);
  logger.info(`  💬 WhatsApp:   ${config.meta.whatsappPhoneNumberId ? 'Configured' : 'Mock Mode'}`);
  logger.info(`  📸 Instagram:  ${config.meta.instagramAccountId ? 'Configured' : 'Mock Mode'}`);
  logger.info(`  🎯 Meta CAPI:  ${config.meta.facebookPixelId ? 'Configured' : 'Mock Mode'}`);
  logger.info(`================================================================`);
});

export default server;
