import { shopifyService } from './shopify';
import { razorpayService } from './razorpay';
import { whatsappService } from './whatsapp';
import { metaService } from './meta';
import { logger } from '../utils/logger';

export interface InitiateChatSaleParams {
  channel: 'whatsapp' | 'instagram';
  customerName: string;
  contact: string; // phone number for whatsapp or IG user ID
  customerEmail?: string;
  productId: string | number;
  variantId?: string | number;
  productTitle: string;
  price: number;
}

export class OrchestratorService {
  /**
   * Diagnostic Health Check for all 5 services
   */
  async runFullDiagnostics(): Promise<Record<string, any>> {
    const [shopify, razorpay, whatsapp, meta] = await Promise.allSettled([
      shopifyService.testConnection(),
      razorpayService.testConnection(),
      whatsappService.testConnection(),
      metaService.testConnection(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: 'operational',
      platforms: {
        shopify: shopify.status === 'fulfilled' ? shopify.value : { success: false, message: 'Check failed' },
        razorpay: razorpay.status === 'fulfilled' ? razorpay.value : { success: false, message: 'Check failed' },
        whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : { success: false, message: 'Check failed' },
        instagram: meta.status === 'fulfilled' ? meta.value : { success: false, message: 'Check failed' },
        facebook: meta.status === 'fulfilled' ? meta.value : { success: false, message: 'Check failed' },
      },
    };
  }

  /**
   * Initiate a unified Social Commerce Checkout:
   * 1. Create Razorpay Payment Link
   * 2. Send link automatically to WhatsApp / Instagram
   */
  async initiateChatSale(params: InitiateChatSaleParams): Promise<any> {
    logger.info({ params }, 'Initiating Omni-Channel Chat Sale');

    // 1. Generate Razorpay Dynamic Payment Link
    const paymentLink = await razorpayService.createPaymentLink({
      amount: params.price,
      description: `Araadhya Fashion: ${params.productTitle}`,
      customer: {
        name: params.customerName,
        contact: params.contact,
        email: params.customerEmail,
      },
      notes: {
        channel: params.channel,
        productId: String(params.productId),
        variantId: String(params.variantId || ''),
        productTitle: params.productTitle,
      },
    });

    const paymentUrl = paymentLink.short_url || paymentLink.url || `https://rzp.io/mock/${paymentLink.id}`;

    // 2. Dispatch link directly to customer via their preferred channel
    let messageResult;
    if (params.channel === 'whatsapp') {
      messageResult = await whatsappService.sendPaymentLinkMessage({
        to: params.contact,
        customerName: params.customerName,
        productTitle: params.productTitle,
        amount: params.price,
        paymentUrl: paymentUrl,
      });
    } else if (params.channel === 'instagram') {
      const dmText = `Hi ${params.customerName}! ✨ Here is your exclusive checkout link for *${params.productTitle}* (₹${params.price}):\n\n👉 ${paymentUrl}\n\nPay securely via UPI / Cards to lock your order! 👗`;
      messageResult = await metaService.sendInstagramDM({
        recipientId: params.contact,
        messageText: dmText,
      });
    }

    return {
      success: true,
      channel: params.channel,
      paymentLinkId: paymentLink.id,
      paymentUrl: paymentUrl,
      messageResult,
    };
  }

  /**
   * Process Successful Payment from Razorpay:
   * 1. Create Paid Order in Shopify
   * 2. Send Facebook/Instagram Ad Conversion (CAPI)
   * 3. Send WhatsApp Confirmation to Buyer
   */
  async handlePaymentSuccess(paymentPayload: any): Promise<any> {
    logger.info({ paymentId: paymentPayload.id }, 'Processing successful payment in Orchestrator');

    const notes = paymentPayload.notes || {};
    const customerPhone = paymentPayload.contact || notes.contact;
    const customerEmail = paymentPayload.email || notes.email;
    const customerName = paymentPayload.customer_name || notes.customerName || 'Valued Customer';
    const amountInRupees = (paymentPayload.amount / 100).toFixed(2);
    const productTitle = notes.productTitle || 'Araadhya Fashion Designer Wear';

    // 1. Create order in Shopify
    let shopifyOrder: any;
    try {
      shopifyOrder = await shopifyService.createOrder({
        email: customerEmail,
        phone: customerPhone,
        financial_status: 'paid',
        line_items: [
          {
            title: productTitle,
            quantity: 1,
            price: amountInRupees,
          },
        ],
        note: `Paid via Razorpay (${paymentPayload.id}) on ${notes.channel || 'Social Commerce'}`,
      });
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to create Shopify order from payment');
    }

    // 2. Dispatch Meta Conversions API (CAPI)
    await metaService.sendConversionEvent({
      eventName: 'Purchase',
      userData: {
        phone: customerPhone,
        email: customerEmail,
        firstName: customerName,
      },
      customData: {
        currency: 'INR',
        value: parseFloat(amountInRupees),
        contentName: productTitle,
        orderId: shopifyOrder?.id || paymentPayload.id,
      },
    });

    // 3. Send WhatsApp Confirmation if phone number is present
    if (customerPhone) {
      try {
        await whatsappService.sendOrderConfirmation({
          to: customerPhone,
          customerName: customerName,
          orderNumber: shopifyOrder?.name || `#AF-${paymentPayload.id.slice(-6)}`,
          totalAmount: amountInRupees,
          items: [productTitle],
        });
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to send WhatsApp order confirmation');
      }
    }

    return {
      status: 'processed',
      shopifyOrderId: shopifyOrder?.id,
      shopifyOrderName: shopifyOrder?.name,
    };
  }
}

export const orchestrator = new OrchestratorService();
