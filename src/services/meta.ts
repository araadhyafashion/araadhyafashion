import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface SendInstagramDMParams {
  recipientId: string;
  messageText: string;
}

export interface MetaConversionEventParams {
  eventName: 'Purchase' | 'InitiateCheckout' | 'Lead' | 'ViewContent';
  eventSourceUrl?: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    contentName?: string;
    orderId?: string;
  };
}

export class MetaService {
  private baseURL = 'https://graph.facebook.com/v19.0';

  private get headers() {
    return {
      Authorization: `Bearer ${config.meta.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test Meta Graph API connection (Facebook Page and Instagram Account)
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.meta.accessToken || config.meta.accessToken.includes('mock')) {
      return {
        success: false,
        message: 'Meta Access Token not configured. Running in simulated mode.',
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/me?fields=id,name`, {
        headers: this.headers,
        timeout: 8000,
      });

      return {
        success: true,
        message: `Connected successfully to Meta Graph API (${response.data.name || response.data.id})`,
        details: response.data,
      };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Meta Graph connection test failed');
      return {
        success: false,
        message: `Meta Graph API Error: ${error.response?.data?.error?.message || error.message}`,
      };
    }
  }

  /**
   * Send Direct Message on Instagram via Messenger / Instagram Graph API
   */
  async sendInstagramDM(params: SendInstagramDMParams): Promise<any> {
    if (!config.meta.isInstagramConfigured()) {
      logger.info({ params }, '[MOCK] Instagram DM sent');
      return { status: 'mock_sent', recipientId: params.recipientId, text: params.messageText };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/me/messages`,
        {
          recipient: { id: params.recipientId },
          message: { text: params.messageText },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Failed to send Instagram DM');
      throw new Error(error.response?.data?.error?.message || error.message);
    }
  }

  /**
   * Send Conversions API (CAPI) event for Facebook/Instagram Ads Tracking
   */
  async sendConversionEvent(params: MetaConversionEventParams): Promise<any> {
    if (!config.meta.facebookPixelId || !config.meta.accessToken || config.meta.accessToken.includes('mock')) {
      logger.info({ event: params.eventName }, '[MOCK] Meta CAPI Conversion event logged');
      return { status: 'mock_logged', event: params.eventName };
    }

    const hash = (value?: string) =>
      value ? crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex') : undefined;

    const eventPayload = {
      data: [
        {
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: params.eventSourceUrl || config.appUrl,
          user_data: {
            em: hash(params.userData.email),
            ph: hash(params.userData.phone),
            fn: hash(params.userData.firstName),
            client_ip_address: params.userData.clientIpAddress,
            client_user_agent: params.userData.clientUserAgent,
          },
          custom_data: params.customData,
        },
      ],
    };

    try {
      const response = await axios.post(
        `${this.baseURL}/${config.meta.facebookPixelId}/events`,
        eventPayload,
        { headers: this.headers }
      );
      logger.info({ eventName: params.eventName }, 'Meta CAPI event dispatched successfully');
      return response.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Meta CAPI event dispatch failed');
      // non-blocking for core sales flow
      return null;
    }
  }
}

export const metaService = new MetaService();
