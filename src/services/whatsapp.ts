import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface SendTextMessageParams {
  to: string; // recipient phone number with country code, e.g. 919876543210
  text: string;
}

export interface SendPaymentLinkMessageParams {
  to: string;
  customerName: string;
  productTitle: string;
  amount: number;
  paymentUrl: string;
}

export interface SendOrderConfirmationParams {
  to: string;
  customerName: string;
  orderNumber: string;
  totalAmount: string;
  items: string[];
}

export class WhatsAppService {
  private baseURL: string;

  constructor() {
    this.baseURL = `https://graph.facebook.com/v19.0/${config.meta.whatsappPhoneNumberId}`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${config.meta.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test WhatsApp Cloud API Connectivity
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!config.meta.isWhatsAppConfigured()) {
      return {
        success: false,
        message: 'WhatsApp credentials (META_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) missing. Running in simulated mode.',
      };
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${config.meta.whatsappPhoneNumberId}`,
        { headers: this.headers, timeout: 8000 }
      );
      return {
        success: true,
        message: `Connected successfully to WhatsApp Cloud API (Display: ${response.data.display_phone_number || response.data.id})`,
      };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'WhatsApp connection test failed');
      return {
        success: false,
        message: `WhatsApp API Error: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }

  /**
   * Send regular text message
   */
  async sendTextMessage(params: SendTextMessageParams): Promise<any> {
    const cleanPhone = params.to.replace(/\D/g, '');

    if (!config.meta.isWhatsAppConfigured()) {
      logger.info({ to: cleanPhone, text: params.text }, '[MOCK] WhatsApp Text Message sent');
      return { status: 'mock_sent', to: cleanPhone, message: params.text };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: true, body: params.text },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Failed to send WhatsApp message');
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  /**
   * Send WhatsApp Instant Checkout message with Razorpay link & Araadhya Fashion branding
   */
  async sendPaymentLinkMessage(params: SendPaymentLinkMessageParams): Promise<any> {
    const message = `✨ *Araadhya Fashion - Exclusive Order* ✨\n\n` +
      `Hello ${params.customerName},\n\n` +
      `Thank you for your interest in our collection! Here are your checkout details:\n\n` +
      `👗 *Item*: ${params.productTitle}\n` +
      `💰 *Amount*: ₹${params.amount.toLocaleString('en-IN')}\n\n` +
      `👉 *Click here to complete your secure payment via Razorpay / UPI*:\n` +
      `${params.paymentUrl}\n\n` +
      `Once paid, we will immediately process your order and send your tracking details here! 🚀`;

    return this.sendTextMessage({
      to: params.to,
      text: message,
    });
  }

  /**
   * Send Order Confirmation message on WhatsApp
   */
  async sendOrderConfirmation(params: SendOrderConfirmationParams): Promise<any> {
    const itemsList = params.items.map((i) => `• ${i}`).join('\n');
    const message = `🎉 *Order Confirmed! | Araadhya Fashion* 🎉\n\n` +
      `Dear ${params.customerName},\n` +
      `Your order *${params.orderNumber}* has been confirmed!\n\n` +
      `📦 *Items*:\n${itemsList}\n\n` +
      `💵 *Total Paid*: ₹${params.totalAmount}\n\n` +
      `We are preparing your exquisite outfit with utmost care. You will receive courier tracking details once dispatched. Thank you for choosing Araadhya Fashion! 💖`;

    return this.sendTextMessage({
      to: params.to,
      text: message,
    });
  }
}

export const whatsappService = new WhatsAppService();
