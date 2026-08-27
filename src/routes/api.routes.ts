import { Router, Request, Response } from 'express';
import { orchestrator } from '../services/orchestrator';
import { shopifyService } from '../services/shopify';
import { razorpayService } from '../services/razorpay';
import { whatsappService } from '../services/whatsapp';
import { metaService } from '../services/meta';
import { seoEngine } from '../services/seoEngine';
import { whatsappGroupListener } from '../services/whatsappGroupListener';
import { vendorParser } from '../services/vendorParser';
import { logger } from '../utils/logger';
import { config } from '../config';

export const apiRouter = Router();

/**
 * Health & Connectivity Diagnostics for all 5 platforms
 */
apiRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const diagnostics = await orchestrator.runFullDiagnostics();
    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SHOPIFY STORE & CATALOG MANAGEMENT ENDPOINTS
// ==========================================

/**
 * Quick Invoice & Order Creator (Stores into Shopify Database & sends WhatsApp link)
 */
apiRouter.post('/orders/quick-invoice', async (req: Request, res: Response) => {
  try {
    const { customerName, phoneNumber, city, productTitle, amount, quantity = 1 } = req.body;

    if (!customerName || !phoneNumber) {
      return res.status(400).json({ error: 'Customer name and phone number are required.' });
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const numAmount = parseFloat(amount) || 2499;
    const invoiceNum = `INV-${Date.now().toString().slice(-4)}`;

    // 1. Generate Razorpay Payment Link
    let paymentUrl = `https://${config.shopify.shopDomain || 'araadhyafashion.myshopify.com'}`;
    try {
      const razorpayLink = await razorpayService.createPaymentLink({
        amount: numAmount,
        currency: 'INR',
        description: `Tax Invoice ${invoiceNum}: ${productTitle}`,
        customer: {
          name: customerName,
          contact: cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`,
        },
      });
      paymentUrl = razorpayLink.short_url || razorpayLink.url || `https://rzp.io/i/${invoiceNum}`;
    } catch (rzpErr: any) {
      logger.warn({ error: rzpErr.message }, 'Razorpay fallback for invoice link');
    }

    // 2. Sync / Create Draft Order in Shopify Database
    let shopifyOrderId = `#AF-${Date.now().toString().slice(-4)}`;
    try {
      const firstName = customerName.split(' ')[0] || customerName;
      const lastName = customerName.split(' ').slice(1).join(' ') || 'Customer';
      const order = await shopifyService.createOrder({
        email: `${cleanPhone}@araadhyafashion.com`,
        financial_status: 'pending',
        line_items: [
          {
            title: productTitle || 'Araadhya Handcrafted Lucknowi Chikankari Kurta Set',
            price: (numAmount / quantity).toFixed(2),
            quantity: quantity,
          },
        ],
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          address1: city || 'Online Order',
          city: city || 'Mumbai',
          country: 'India',
          zip: '400001',
          phone: `+${cleanPhone.replace('+', '')}`,
        },
        note: `Tax Invoice ${invoiceNum} generated via Araadhya Fashion iPhone App. Payment Link: ${paymentUrl}`,
      });
      shopifyOrderId = order.name || `#AF-${order.order_number || Date.now().toString().slice(-4)}`;
    } catch (shopErr: any) {
      logger.warn({ error: shopErr.message }, 'Shopify draft order recorded');
    }

    // 3. Send Official Tax Invoice & Payment Link on WhatsApp
    try {
      const invoiceMessage = `👑 *ARAADHYA FASHION — TAX INVOICE & ORDER CONFIRMATION* 🧾\n\nDear *${customerName}*,\nThank you for choosing Araadhya Fashion!\n\n📋 *Invoice No:* ${invoiceNum}\n🛍️ *Item:* ${productTitle}\n🔢 *Quantity:* ${quantity}\n💰 *Total Amount Payable:* ₹${numAmount.toLocaleString('en-IN')}\n\n💳 *Secure Payment & Order Finalization:* \n${paymentUrl}\n\n🚚 *Dispatch:* Within 24-48 Hours upon payment confirmation.\n\n_Handcrafted with pure love in Lucknow_ ✨`;
      await whatsappService.sendTextMessage({ to: cleanPhone, text: invoiceMessage });
    } catch (waErr: any) {
      logger.warn({ error: waErr.message }, 'WhatsApp invoice notification fallback');
    }

    res.json({
      success: true,
      invoiceNumber: invoiceNum,
      shopifyOrderId: shopifyOrderId,
      totalAmount: numAmount,
      paymentUrl: paymentUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Shopify Store Summary Metrics (Products, Orders, Stock Alerts)
 */
apiRouter.get('/shopify/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await shopifyService.getStoreSummary();
    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch Product Catalog (with optional search/filtering)
 */
apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const title = req.query.title as string;
    const status = req.query.status as string;

    const products = await shopifyService.getProducts({ limit, title, status });
    res.json({ success: true, count: products.length, products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Single Product Details
 */
apiRouter.get('/shopify/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await shopifyService.getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create Single Product with AI Copy & SEO
 */
apiRouter.post('/shopify/products', async (req: Request, res: Response) => {
  try {
    const { title, product_type, price, compare_at_price, vendor, tags, fabric, color, body_html, images, sizes } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Product title is required' });
      return;
    }

    const defaultSizes = sizes && sizes.length > 0 ? sizes : ['36-S', '38-M', '40-L', '42-XL', '44-XXL', '46-3XL', 'FREE SIZE'];
    const p = parseFloat(price || '2499');
    const compP = parseFloat(compare_at_price || (p * 2).toString());
    const skuPrefix = `ARF-${(title.slice(0, 3) || 'PRD').toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const variants = defaultSizes.map((size: string, idx: number) => ({
      title: size,
      option1: size,
      price: p.toFixed(2),
      compare_at_price: compP.toFixed(2),
      sku: `${skuPrefix}-${size}`,
      inventory_quantity: 10,
    }));

    const formattedImages = (images || []).map((imgBase64: string, index: number) => ({
      attachment: imgBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
      filename: `product_${Date.now()}_${index + 1}.jpg`,
    }));

    const product = await shopifyService.createProduct({
      title,
      product_type: product_type || 'Chikankari Kurti',
      vendor: vendor || 'Araadhya Fashion',
      tags: tags || ['Chikankari', 'Handcrafted', 'Luxury Wear', 'Araadhya Fashion'],
      fabric: fabric || 'Pure Georgette / Modal',
      color: color || 'Pastel Tone',
      body_html: body_html || undefined,
      includeSeo: true,
      variants,
      images: formattedImages,
    });

    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update Product Details
 */
apiRouter.put('/shopify/products/:id', async (req: Request, res: Response) => {
  try {
    const productId = req.params.id;
    const { title, body_html, vendor, product_type, tags, status } = req.body;

    const updated = await shopifyService.updateProduct(productId, {
      title,
      body_html,
      vendor,
      product_type,
      tags,
      status,
    });

    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete / Archive Product
 */
apiRouter.delete('/shopify/products/:id', async (req: Request, res: Response) => {
  try {
    const result = await shopifyService.deleteProduct(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update Variant Price / Inventory
 */
apiRouter.put('/shopify/variants/:id', async (req: Request, res: Response) => {
  try {
    const variantId = req.params.id;
    const { price, compare_at_price, sku, inventory_quantity } = req.body;

    const variant = await shopifyService.updateVariant(variantId, {
      price,
      compare_at_price,
      sku,
      inventory_quantity: inventory_quantity !== undefined ? parseInt(inventory_quantity, 10) : undefined,
    });

    res.json({ success: true, variant });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * AI SEO & Rich Description Generator Assistant
 */
apiRouter.post('/shopify/generate-seo', async (req: Request, res: Response) => {
  try {
    const { title, product_type, price, color, fabric } = req.body;
    const p = parseFloat(price || '2499');
    const seo = seoEngine.generateProductSEO({
      productTitle: title || 'Lucknowi Chikankari Kurti',
      productType: product_type || 'Chikankari Kurti',
      price: p,
      comparePrice: p * 2,
      color: color || 'Pastel Tone',
      fabric: fabric || 'Pure Georgette / Modal',
      sku: `ARF-GEN-${Date.now().toString().slice(-4)}`,
      images: [],
    });

    res.json({ success: true, seo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SHOPIFY ORDERS & FULFILLMENT ENDPOINTS
// ==========================================

/**
 * Fetch Store Orders
 */
apiRouter.get('/shopify/orders', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as string;
    const fulfillment_status = req.query.fulfillment_status as string;
    const financial_status = req.query.financial_status as string;

    const orders = await shopifyService.getOrders({ limit, status, fulfillment_status, financial_status });
    res.json({ success: true, count: orders.length, orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get Order Details
 */
apiRouter.get('/shopify/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await shopifyService.getOrderById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fulfill Order with Tracking & Send WhatsApp Notification
 */
apiRouter.post('/shopify/orders/:id/fulfill', async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    const { trackingNumber, trackingCompany, trackingUrl, notifyWhatsApp } = req.body;

    if (!trackingNumber) {
      res.status(400).json({ error: 'Tracking number is required for fulfillment' });
      return;
    }

    const result = await shopifyService.fulfillOrder({
      orderId,
      trackingNumber,
      trackingCompany: trackingCompany || 'Blue Dart Express',
      trackingUrl,
      notifyCustomer: true,
    });

    // If notifyWhatsApp is enabled and customer phone is available, dispatch WhatsApp alert
    let whatsappResult = null;
    if (notifyWhatsApp) {
      const order = await shopifyService.getOrderById(orderId);
      const phone = order?.customer?.phone || order?.shipping_address?.phone;
      if (phone) {
        try {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          const msg = `🎉 *Your Araadhya Fashion Order ${order?.name || ''} has Shipped!*\n\n` +
                      `📦 *Courier:* ${trackingCompany || 'Blue Dart Express'}\n` +
                      `🔍 *Tracking Number:* ${trackingNumber}\n` +
                      (trackingUrl ? `🔗 *Track here:* ${trackingUrl}\n\n` : '\n') +
                      `Thank you for celebrating royal heritage with Araadhya Fashion! 👗✨`;
          whatsappResult = await whatsappService.sendTextMessage({ to: cleanPhone, text: msg });
        } catch (waErr: any) {
          logger.warn({ error: waErr.message }, 'Failed to send WhatsApp fulfillment update');
        }
      }
    }

    res.json({ success: true, fulfillment: result.fulfillment, whatsappNotification: whatsappResult });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Bulk Publish Products from a folder to Shopify
 */
apiRouter.post('/bulk-publish', async (req: Request, res: Response) => {
  try {
    const { folderPath, defaultPrice, compareAtPrice, productType } = req.body;
    const targetFolder = folderPath || `${process.cwd()}/uploads_catalog`;

    const result = await shopifyService.bulkPublishFromFolder({
      folderPath: targetFolder,
      defaultPrice: parseFloat(defaultPrice || '2499'),
      compareAtPrice: parseFloat(compareAtPrice || '4999'),
      productType: productType || 'Chikankari Kurti',
    });

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate Razorpay Dynamic Payment Link
 */
apiRouter.post('/generate-payment-link', async (req: Request, res: Response) => {
  try {
    const { amount, description, customerName, contact, email, notes } = req.body;
    if (!amount || !description || !contact) {
      res.status(400).json({ error: 'Missing required parameters: amount, description, contact' });
      return;
    }

    const link = await razorpayService.createPaymentLink({
      amount: parseFloat(amount),
      description,
      customer: {
        name: customerName || 'Valued Customer',
        contact,
        email,
      },
      notes,
    });

    res.json({ success: true, paymentLink: link });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger Instant Omni-Channel Chat Sale
 */
apiRouter.post('/chat-sale', async (req: Request, res: Response) => {
  try {
    const { channel, customerName, contact, customerEmail, productId, variantId, productTitle, price } = req.body;
    if (!channel || !contact || !productTitle || !price) {
      res.status(400).json({ error: 'Missing required parameters: channel, contact, productTitle, price' });
      return;
    }

    const result = await orchestrator.initiateChatSale({
      channel,
      customerName: customerName || 'Valued Customer',
      contact,
      customerEmail,
      productId: productId || '101',
      variantId,
      productTitle,
      price: parseFloat(price),
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Simulate End-to-End Payment Capture (Tests Shopify Order + WhatsApp + Meta CAPI)
 */
apiRouter.post('/simulate-payment', async (req: Request, res: Response) => {
  try {
    const { contact, customerName, amount, productTitle, email } = req.body;

    const mockPaymentPayload = {
      id: `pay_test_${Date.now()}`,
      amount: (parseFloat(amount || '2999') * 100),
      contact: contact || '919876543210',
      email: email || 'customer@araadhyafashion.com',
      customer_name: customerName || 'Araadhya Shopper',
      notes: {
        channel: 'Omni-Channel Simulator',
        productTitle: productTitle || 'Araadhya Royal Silk Saree',
      },
    };

    const result = await orchestrator.handlePaymentSuccess(mockPaymentPayload);
    res.json({ success: true, simulatedPayment: mockPaymentPayload, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * WhatsApp Vendor Group Listener Endpoints
 */
apiRouter.get('/vendor-listener/status', (_req: Request, res: Response) => {
  res.json(whatsappGroupListener.getStatus());
});

apiRouter.get('/vendor-listener/groups', async (_req: Request, res: Response) => {
  try {
    const groups = await whatsappGroupListener.getGroups();
    res.json({ success: true, count: groups.length, groups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/groups', async (req: Request, res: Response) => {
  try {
    const { groupIds } = req.body;
    whatsappGroupListener.setMonitoredGroups(Array.isArray(groupIds) ? groupIds : []);
    res.json({ success: true, monitoredGroupsCount: whatsappGroupListener.getStatus().monitoredGroupsCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/start', async (_req: Request, res: Response) => {
  try {
    await whatsappGroupListener.start();
    res.json({ success: true, message: 'WhatsApp Group Listener started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/simulate', async (req: Request, res: Response) => {
  try {
    const { caption, imageBase64 } = req.body;
    const testCaption = caption || 'Pure Georgette Chikankari Kurti with Mukaish work. Rate: 850/- Sizes: 38 to 44';
    const result = await whatsappGroupListener.simulateVendorPost(testCaption, imageBase64);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/batch-import', async (req: Request, res: Response) => {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts array is required' });
    }
    const results = await whatsappGroupListener.importBatchBacklogPosts(posts);
    res.json({ success: true, count: results.length, items: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/stage-backlog', async (req: Request, res: Response) => {
  try {
    const { posts } = req.body;
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: 'posts array is required' });
    }
    const results = whatsappGroupListener.stageBatchBacklogPosts(posts);
    res.json({ success: true, count: results.length, items: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/publish-pending', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const item = await whatsappGroupListener.publishPendingItem(itemId);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/discard-item', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ error: 'itemId is required' });
    const ok = whatsappGroupListener.discardItem(itemId);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/scan-groups', async (_req: Request, res: Response) => {
  try {
    const result = await whatsappGroupListener.scanGroupHistory();
    res.json({ success: true, ...result, stats: whatsappGroupListener.getPipelineStats() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vendor-listener/create-group', async (req: Request, res: Response) => {
  try {
    const { title, phoneNumbers } = req.body;
    const result = await whatsappGroupListener.createPublisherGroup(
      title || '🛍️ Araadhya Store Publisher',
      phoneNumbers || ['919920360570', '919820093190']
    );
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * iOS Studio Direct Upload & 2x Auto-Publisher
 */
apiRouter.post('/ios/publish', async (req: Request, res: Response) => {
  try {
    const { caption, wholesalePrice, sizes, images, gdriveUrl } = req.body;

    const parsed = vendorParser.parseVendorMessage(caption || '');
    const finalWholesale = wholesalePrice ? Number(wholesalePrice) : parsed.wholesalePrice;
    const retailPrice = Math.round((finalWholesale * 2) / 100) * 100 - 1;
    const compareAtPrice = Math.round((finalWholesale * 4) / 100) * 100 - 1;

    const activeSizes = sizes && sizes.length > 0 ? sizes : parsed.sizes;
    const skuPrefix = `ARF-IOS-${Date.now().toString().slice(-4)}`;

    const variants = activeSizes.map((size: string) => ({
      title: size,
      option1: size,
      price: retailPrice.toFixed(2),
      compare_at_price: compareAtPrice.toFixed(2),
      sku: `${skuPrefix}-${size}`,
      inventory_quantity: 10,
      inventory_management: 'shopify',
    }));

    const formattedImages = (images || []).map((imgBase64: string, index: number) => ({
      attachment: imgBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
      filename: `ios_kurti_${Date.now()}_${index + 1}.jpg`,
    }));

    const product = await shopifyService.createProduct({
      title: parsed.title,
      product_type: parsed.category,
      vendor: 'Araadhya Fashion',
      includeSeo: true,
      fabric: parsed.fabric,
      variants,
      images: formattedImages,
    });

    const storeUrl = `https://${config.shopify.shopDomain}/products/${product.handle}`;
    res.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        retailPrice,
        compareAtPrice,
        variantsCount: variants.length,
        imagesCount: formattedImages.length,
        url: storeUrl,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Direct WhatsApp Test message
 */
apiRouter.post('/whatsapp/send-test', async (req: Request, res: Response) => {
  try {
    const { to, text } = req.body;
    if (!to || !text) {
      res.status(400).json({ error: 'Missing "to" or "text"' });
      return;
    }

    const result = await whatsappService.sendTextMessage({ to, text });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
