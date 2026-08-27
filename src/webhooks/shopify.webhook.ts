import { Request, Response } from 'express';
import { shopifyService } from '../services/shopify';
import { whatsappService } from '../services/whatsapp';
import { metaService } from '../services/meta';
import { logger } from '../utils/logger';

export async function handleShopifyWebhook(req: Request, res: Response): Promise<void> {
  const topic = req.headers['x-shopify-topic'] as string;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string;

  // Verify HMAC signature
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  if (!shopifyService.verifyWebhook(rawBody, hmacHeader)) {
    logger.warn('Shopify webhook signature mismatch');
    res.status(401).json({ error: 'Unauthorized webhook' });
    return;
  }

  logger.info({ topic }, 'Received valid Shopify Webhook');
  const payload = req.body;

  try {
    switch (topic) {
      case 'orders/create':
      case 'orders/paid': {
        const phone = payload.customer?.phone || payload.shipping_address?.phone;
        const customerName = payload.customer?.first_name || 'Customer';
        const orderNumber = payload.name || `#${payload.order_number}`;
        const total = payload.total_price;
        const items = (payload.line_items || []).map((li: any) => `${li.title} (Qty: ${li.quantity})`);

        // Send WhatsApp Notification to Customer
        if (phone) {
          await whatsappService.sendOrderConfirmation({
            to: phone,
            customerName,
            orderNumber,
            totalAmount: total,
            items,
          });
        }

        // Send Meta CAPI Conversion
        await metaService.sendConversionEvent({
          eventName: 'Purchase',
          userData: {
            phone,
            email: payload.customer?.email,
            firstName: customerName,
          },
          customData: {
            currency: payload.currency || 'INR',
            value: parseFloat(total),
            orderId: String(payload.id),
          },
        });
        break;
      }

      case 'products/update':
        logger.info({ productId: payload.id, title: payload.title }, 'Shopify product updated');
        break;

      default:
        logger.info({ topic }, 'Unhandled Shopify webhook topic');
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error handling Shopify webhook');
    res.status(500).json({ error: error.message });
  }
}
