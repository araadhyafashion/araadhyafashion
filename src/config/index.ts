import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',

  shopify: {
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || '',
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
    isConfigured: (): boolean => {
      return (
        Boolean(process.env.SHOPIFY_SHOP_DOMAIN) &&
        !process.env.SHOPIFY_SHOP_DOMAIN?.includes('example') &&
        (Boolean(process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN.includes('mock')) ||
         Boolean(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET))
      );
    },
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
    isConfigured: (): boolean => {
      return (
        Boolean(process.env.RAZORPAY_KEY_ID) &&
        !process.env.RAZORPAY_KEY_ID?.includes('mock') &&
        Boolean(process.env.RAZORPAY_KEY_SECRET) &&
        !process.env.RAZORPAY_KEY_SECRET?.includes('mock')
      );
    },
  },

  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    accessToken: process.env.META_ACCESS_TOKEN || '',
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'araadhya_fashion_verify_token_secure_123',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
    facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
    facebookPixelId: process.env.FACEBOOK_PIXEL_ID || '',
    isWhatsAppConfigured: (): boolean => {
      return (
        Boolean(process.env.META_ACCESS_TOKEN) &&
        !process.env.META_ACCESS_TOKEN?.includes('mock') &&
        Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
        !process.env.WHATSAPP_PHONE_NUMBER_ID?.includes('mock')
      );
    },
    isInstagramConfigured: (): boolean => {
      return (
        Boolean(process.env.META_ACCESS_TOKEN) &&
        !process.env.META_ACCESS_TOKEN?.includes('mock') &&
        Boolean(process.env.INSTAGRAM_ACCOUNT_ID) &&
        !process.env.INSTAGRAM_ACCOUNT_ID?.includes('mock')
      );
    },
    isFacebookConfigured: (): boolean => {
      return (
        Boolean(process.env.META_ACCESS_TOKEN) &&
        !process.env.META_ACCESS_TOKEN?.includes('mock') &&
        Boolean(process.env.FACEBOOK_PAGE_ID) &&
        !process.env.FACEBOOK_PAGE_ID?.includes('mock')
      );
    },
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    isConfigured: (): boolean => Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10),
  },
};
