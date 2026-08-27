import { Request, Response } from 'express';
import { config } from '../config';
import { whatsappService } from '../services/whatsapp';
import { metaService } from '../services/meta';
import { shopifyService } from '../services/shopify';
import { orchestrator } from '../services/orchestrator';
import { logger } from '../utils/logger';

// In-memory buffer for multi-image WhatsApp forwards
interface MerchantBuffer {
  imageIds: string[];
  captions: string[];
}

const merchantUploadBuffers: Record<string, MerchantBuffer> = {};

/**
 * Meta Webhook Verification Handshake (GET)
 */
export function verifyMetaWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === (config.meta.verifyToken || 'araadhya_fashion_verify_token_secure_123')) {
    logger.info('Meta Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, 'Meta Webhook verification failed - token mismatch');
    res.status(403).send('Verification failed');
  }
}

/**
 * Helper to process and publish buffered product
 */
async function processAndPublishBuffer(fromNumber: string, buf: MerchantBuffer): Promise<void> {
  const finalCaptions = buf.captions.join('\n');
  const finalImageIds = [...buf.imageIds];

  // 1. Send Instant Processing Notification
  const instantAck = `📸 *We have received your product photos & details!* ⏳\n\n` +
    `_Analyzing fabric, calculating 2x selling price & publishing live to your store... Please give us 10-15 seconds!_ ✨`;
  await whatsappService.sendTextMessage({ to: fromNumber, text: instantAck });

  logger.info({ count: finalImageIds.length, captions: finalCaptions }, 'Executing "done" publish command');

  const { vendorParser } = await import('../services/vendorParser');
  const parsed = vendorParser.parseVendorMessage(finalCaptions);

  // Download all images from Meta Graph API
  const axios = (await import('axios')).default;
  const formattedImages: { attachment: string; filename: string }[] = [];

  for (let i = 0; i < finalImageIds.length; i++) {
    try {
      const mediaRes = await axios.get(`https://graph.facebook.com/v19.0/${finalImageIds[i]}`, {
        headers: { Authorization: `Bearer ${config.meta.accessToken}` },
      });
      const mediaUrl = mediaRes.data?.url;
      if (mediaUrl) {
        const imgBuffer = await axios.get(mediaUrl, {
          headers: { Authorization: `Bearer ${config.meta.accessToken}` },
          responseType: 'arraybuffer',
        });
        formattedImages.push({
          attachment: Buffer.from(imgBuffer.data).toString('base64'),
          filename: `wa_kurti_${Date.now()}_${i + 1}.jpg`,
        });
      }
    } catch (imgErr: any) {
      logger.warn({ error: imgErr.message }, 'Failed to fetch one WhatsApp media attachment');
    }
  }

  const skuPrefix = `ARF-WA-${Date.now().toString().slice(-4)}`;
  const variants = parsed.sizes.map((size) => ({
    title: size,
    option1: size,
    price: parsed.retailPrice.toFixed(2),
    compare_at_price: parsed.compareAtPrice.toFixed(2),
    sku: `${skuPrefix}-${size}`,
    inventory_quantity: 12,
    inventory_management: 'shopify',
  }));

  const product = await shopifyService.createProduct({
    title: parsed.title,
    product_type: parsed.category,
    vendor: 'Araadhya Fashion',
    includeSeo: true,
    fabric: parsed.fabric,
    variants,
    images: formattedImages.length > 0 ? formattedImages : undefined,
  });

  const storeUrl = `https://${config.shopify.shopDomain || 'araadhyafashion.myshopify.com'}/products/${product.handle}`;
  const confirmation = `👑 *NEW PRODUCT PUBLISHED LIVE!* ✨\n\n` +
    `🛍️ *${product.title}*\n\n` +
    `📸 *Photos:* ${formattedImages.length} HD Angles\n` +
    `💰 *Wholesale:* ₹${parsed.wholesalePrice}\n` +
    `🏷️ *Selling Price (2x):* ₹${parsed.retailPrice} (50% OFF)\n` +
    `📏 *Sizes:* ${parsed.sizes.join(', ')}\n\n` +
    `🔗 *Live Store Link:* \n${storeUrl}`;

  await whatsappService.sendTextMessage({ to: fromNumber, text: confirmation });
  logger.info({ productId: product.id, url: storeUrl }, 'Product published from WhatsApp "done" command');
}

/**
 * Handle incoming Meta Webhook Events (POST) - WhatsApp & Instagram
 */
export async function handleMetaWebhook(req: Request, res: Response): Promise<void> {
  const body = req.body;

  if (body.object !== 'whatsapp_business_account' && body.object !== 'instagram' && body.object !== 'page') {
    res.status(404).send('Not Found');
    return;
  }

  // Respond 200 immediately to acknowledge receipt per Meta guidelines
  res.status(200).send('EVENT_RECEIVED');

  try {
    // 1. WhatsApp Events
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const message = change?.messages?.[0];

      if (!message) return;

      const fromNumber = message.from;
      logger.info({ fromNumber, type: message.type }, 'Incoming WhatsApp webhook message');

      // Initialize buffer for this merchant
      if (!merchantUploadBuffers[fromNumber]) {
        merchantUploadBuffers[fromNumber] = {
          imageIds: [],
          captions: [],
        };
      }
      const buf = merchantUploadBuffers[fromNumber];

      // =========================================================================
      // A. IMAGE ATTACHMENTS
      // =========================================================================
      if (message.type === 'image') {
        const caption = message.image.caption || '';
        const imageId = message.image.id;
        buf.imageIds.push(imageId);
        if (caption) buf.captions.push(caption);

        logger.info({ fromNumber, totalImages: buf.imageIds.length }, 'Photo added to merchant staging buffer');
      }

      // =========================================================================
      // B. TEXT MESSAGES
      // =========================================================================
      else if (message.type === 'text') {
        const rawText = message.text.body.trim();
        const lowerText = rawText.toLowerCase();
        logger.info({ fromNumber, rawText }, 'Text message received');

        // 🎯 1. THE "DONE" TRIGGER COMMAND
        if (lowerText === 'done' || lowerText === 'publish' || lowerText === 'upload') {
          if (buf.imageIds.length === 0 && buf.captions.length === 0) {
            await whatsappService.sendTextMessage({
              to: fromNumber,
              text: `⚠️ *No photos or details found in staging!*\n\nPlease forward your Kurti photos and vendor description first, then type *done*!`,
            });
            return;
          }

          try {
            const currentBuf = { ...buf };
            delete merchantUploadBuffers[fromNumber];
            await processAndPublishBuffer(fromNumber, currentBuf);
          } catch (err: any) {
            logger.error({ error: err.message }, 'Failed to publish on "done"');
            await whatsappService.sendTextMessage({
              to: fromNumber,
              text: `⚠️ Error auto-publishing product: ${err.message}`,
            });
          }
          return;
        }

        // 2. VENDOR DETAILS / CAPTION TEXT
        const isVendorText =
          lowerText.includes('rate') ||
          lowerText.includes('price') ||
          lowerText.includes('fabric') ||
          lowerText.includes('size') ||
          lowerText.includes('kurti') ||
          lowerText.includes('free ship') ||
          lowerText.includes('garara') ||
          lowerText.includes('set') ||
          lowerText.includes('anarkali') ||
          lowerText.includes('saree');

        if (isVendorText) {
          buf.captions.push(rawText);
          logger.info({ fromNumber, caption: rawText }, 'Vendor description saved in buffer');
          return;
        }

        // 3. CUSTOMER DISCOVERY / CATALOG SHOPPING
        if (
          lowerText.includes('catalog') ||
          lowerText.includes('saree') ||
          lowerText.includes('lehenga') ||
          lowerText.includes('collection')
        ) {
          const products = await shopifyService.getProducts(3);
          const productList = products
            .map((p, idx) => `${idx + 1}. *${p.title}* - ₹${p.variants[0]?.price || 'N/A'}`)
            .join('\n');

          const reply = `👗 *Araadhya Fashion Top Trending Collection* 👗\n\n${productList}\n\n` +
            `Reply with the product number (e.g. *1*, *2*, or *3*) to get an instant secure checkout link! 🛍️`;

          await whatsappService.sendTextMessage({ to: fromNumber, text: reply });
        } else if (['1', '2', '3'].includes(lowerText)) {
          const products = await shopifyService.getProducts(3);
          const index = parseInt(lowerText, 10) - 1;
          const selectedProduct = products[index];

          if (selectedProduct) {
            await orchestrator.initiateChatSale({
              channel: 'whatsapp',
              customerName: change.contacts?.[0]?.profile?.name || 'Fashion Lover',
              contact: fromNumber,
              productId: selectedProduct.id,
              productTitle: selectedProduct.title,
              price: parseFloat(selectedProduct.variants[0]?.price || '1999'),
            });
          }
        } else {
          const welcome = `Namaste! 🙏 Welcome to *Araadhya Fashion* ✨\n\n` +
            `How can we help you today?\n` +
            `• Type *catalog* to view our latest Sarees, Kurtis & Lehengas\n` +
            `• Forward vendor photos + text, then type *done* to publish live!\n` +
            `• Type *support* to speak with our personal stylist!`;
          await whatsappService.sendTextMessage({ to: fromNumber, text: welcome });
        }
      }
    }

    // 2. Instagram Messaging Events
    if (body.object === 'instagram') {
      const messaging = body.entry?.[0]?.messaging?.[0];
      if (messaging && messaging.message) {
        const senderId = messaging.sender.id;
        const text = messaging.message.text || '';
        logger.info({ senderId, text }, 'Incoming Instagram DM received');

        const reply = `Thank you for reaching out to Araadhya Fashion! ✨ Check out our latest designer wear or message us your favorite style!`;
        await metaService.sendInstagramDM({ recipientId: senderId, messageText: reply });
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error in processing Meta Webhook background event');
  }
}
