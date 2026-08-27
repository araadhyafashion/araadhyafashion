import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface CreatePaymentLinkParams {
  amount: number; // in INR (will be converted to paise)
  currency?: string;
  description: string;
  customer: {
    name: string;
    contact: string;
    email?: string;
  };
  notes?: Record<string, string>;
  callback_url?: string;
}

export class RazorpayService {
  private instance: Razorpay | null = null;

  constructor() {
    if (config.razorpay.isConfigured()) {
      this.instance = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
  }

  private getInstance(): Razorpay {
    if (!this.instance && config.razorpay.isConfigured()) {
      this.instance = new Razorpay({
        key_id: config.razorpay.keyId,
        key_secret: config.razorpay.keySecret,
      });
    }
    if (!this.instance) {
      throw new Error('Razorpay is not configured with valid keys.');
    }
    return this.instance;
  }

  /**
   * Test Razorpay API Connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!config.razorpay.isConfigured()) {
      return {
        success: false,
        message: 'Razorpay Key ID and Secret not configured. Running in simulated mode.',
      };
    }

    try {
      const rzp = this.getInstance();
      // Test by listing orders with limit 1
      await rzp.orders.all({ count: 1 });
      return {
        success: true,
        message: `Connected successfully to Razorpay (Key: ${config.razorpay.keyId.substring(0, 8)}...)`,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Razorpay connection test failed');
      return {
        success: false,
        message: `Razorpay Error: ${error.error?.description || error.message}`,
      };
    }
  }

  /**
   * Create dynamic payment link for WhatsApp / Instagram / Social Selling
   */
  async createPaymentLink(params: CreatePaymentLinkParams): Promise<any> {
    const amountInPaise = Math.round(params.amount * 100);

    if (!config.razorpay.isConfigured()) {
      const mockId = `plink_mock_${Date.now()}`;
      logger.info({ params }, '[MOCK] Created Razorpay Payment Link');
      return {
        id: mockId,
        short_url: `https://rzp.io/i/mock_${mockId}`,
        amount: amountInPaise,
        currency: params.currency || 'INR',
        status: 'created',
        customer: params.customer,
        description: params.description,
        mock: true,
      };
    }

    try {
      const rzp = this.getInstance();
      const response = await rzp.paymentLink.create({
        amount: amountInPaise,
        currency: params.currency || 'INR',
        accept_partial: false,
        description: params.description,
        customer: {
          name: params.customer.name,
          contact: params.customer.contact,
          email: params.customer.email || 'customer@araadhyafashion.com',
        },
        notify: {
          sms: true,
          email: true,
        },
        reminder_enable: true,
        notes: {
          platform: 'Araadhya Fashion Hub',
          ...params.notes,
        },
        callback_url: params.callback_url || `${config.appUrl}/payment-success`,
        callback_method: 'get',
      });

      logger.info({ linkId: response.id, url: response.short_url }, 'Razorpay payment link generated');
      return response;
    } catch (error: any) {
      logger.error({ error: error.message, detail: error.error }, 'Failed to create Razorpay payment link');
      throw new Error(error.error?.description || error.message);
    }
  }

  /**
   * Verify Razorpay Webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!config.razorpay.webhookSecret) return true;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }
}

export const razorpayService = new RazorpayService();
