import { Request, Response } from 'express';
import { razorpayService } from '../services/razorpay';
import { orchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-razorpay-signature'] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  if (signature && !razorpayService.verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook signature verification failed');
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  const event = req.body.event;
  const payload = req.body.payload;

  logger.info({ event }, 'Received Razorpay Webhook Event');

  try {
    switch (event) {
      case 'payment.captured':
      case 'payment_link.paid':
      case 'order.paid': {
        const paymentEntity = payload.payment?.entity || payload.payment_link?.entity;
        if (paymentEntity) {
          await orchestrator.handlePaymentSuccess(paymentEntity);
        }
        break;
      }

      case 'payment.failed':
        logger.warn({ paymentId: payload.payment?.entity?.id }, 'Razorpay payment failed');
        break;

      default:
        logger.info({ event }, 'Ignored Razorpay event');
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error processing Razorpay webhook');
    res.status(500).json({ error: error.message });
  }
}
