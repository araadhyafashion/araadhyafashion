import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config';
import { logger } from '../utils/logger';
import { seoEngine } from './seoEngine';

export interface ShopifyVariant {
  id: string | number;
  product_id?: string | number;
  title: string;
  price: string;
  compare_at_price?: string;
  sku: string;
  position?: number;
  inventory_item_id?: string | number;
  inventory_quantity?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ShopifyProduct {
  id: string | number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  handle?: string;
  tags?: string;
  status?: 'active' | 'archived' | 'draft';
  created_at?: string;
  updated_at?: string;
  variants: ShopifyVariant[];
  images: Array<{
    id?: string | number;
    src: string;
    alt?: string;
    position?: number;
  }>;
  options?: Array<{
    name: string;
    values: string[];
  }>;
}

export interface CreateProductParams {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  status?: 'active' | 'draft' | 'archived';
  includeSeo?: boolean;
  color?: string;
  fabric?: string;
  variants?: Array<{
    title: string;
    price: string;
    compare_at_price?: string;
    sku: string;
    inventory_quantity?: number;
    option1?: string;
  }>;
  images?: Array<{
    attachment?: string; // Base64 encoded string
    src?: string;
    filename?: string;
  }>;
}

export interface UpdateProductParams {
  title?: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  status?: 'active' | 'draft' | 'archived';
}

export interface CreateOrderParams {
  email?: string;
  phone?: string;
  line_items: Array<{
    variant_id?: number | string;
    title: string;
    quantity: number;
    price: string;
  }>;
  shipping_address?: {
    first_name: string;
    last_name?: string;
    address1: string;
    city: string;
    province?: string;
    country: string;
    zip: string;
    phone?: string;
  };
  note?: string;
  financial_status?: 'paid' | 'pending';
}

export interface FulfillOrderParams {
  orderId: string | number;
  trackingNumber: string;
  trackingCompany?: string;
  trackingUrl?: string;
  notifyCustomer?: boolean;
  lineItems?: Array<{ id: string | number; quantity: number }>;
}

export interface ShopifyOrder {
  id: string | number;
  name: string;
  order_number?: number;
  created_at: string;
  financial_status: 'paid' | 'pending' | 'refunded' | 'voided';
  fulfillment_status: 'fulfilled' | 'unfulfilled' | 'partial' | null;
  total_price: string;
  currency: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  line_items: Array<{
    id?: string | number;
    title: string;
    quantity: number;
    price: string;
    sku?: string;
  }>;
  shipping_address?: {
    name?: string;
    address1?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  };
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
}

export interface BulkUploadFolderOptions {
  folderPath: string;
  defaultPrice?: number;
  compareAtPrice?: number;
  productType?: string;
  sizes?: string[];
  limit?: number;
  fabric?: string;
}

export interface StoreSummary {
  totalProducts: number;
  activeProducts: number;
  totalVariants: number;
  lowStockVariants: number;
  totalOrders: number;
  unfulfilledOrders: number;
  paidOrders: number;
  isLive: boolean;
  storeName: string;
  storeDomain: string;
}

export class ShopifyService {
  private baseURL: string;
  private token: string;
  private tokenExpiresAt = 0;

  // In-memory persistent mock state for realistic developer & offline workflow
  private mockProducts: ShopifyProduct[] = [
    {
      id: '101',
      title: 'Araadhya Royal Banarasi Silk Saree',
      product_type: 'Saree',
      vendor: 'Araadhya Fashion',
      handle: 'araadhya-royal-banarasi-silk-saree',
      tags: 'Banarasi, Silk, Saree, Festive, Luxury Wear, Araadhya Fashion',
      status: 'active',
      created_at: '2026-08-20T10:00:00Z',
      variants: [
        { id: 'v101', product_id: '101', title: 'Crimson Red / Free Size', price: '4999.00', compare_at_price: '9999.00', sku: 'AF-BAN-RED', inventory_quantity: 15, option1: 'Free Size' },
        { id: 'v102', product_id: '101', title: 'Royal Emerald Green / Free Size', price: '4999.00', compare_at_price: '9999.00', sku: 'AF-BAN-GRN', inventory_quantity: 8, option1: 'Free Size' },
      ],
      images: [{ id: 'img101', src: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800' }],
    },
    {
      id: '102',
      title: 'Handcrafted Lucknowi Chikankari Anarkali Kurti',
      product_type: 'Kurti',
      vendor: 'Araadhya Fashion',
      handle: 'handcrafted-lucknowi-chikankari-anarkali-kurti',
      tags: 'Chikankari, Lucknowi, Handcrafted, Anarkali, Kurti, Pastel, Araadhya Fashion',
      status: 'active',
      created_at: '2026-08-22T14:30:00Z',
      variants: [
        { id: 'v201', product_id: '102', title: '38-M', price: '2799.00', compare_at_price: '5599.00', sku: 'AF-CHK-M', inventory_quantity: 25, option1: '38-M' },
        { id: 'v202', product_id: '102', title: '40-L', price: '2799.00', compare_at_price: '5599.00', sku: 'AF-CHK-L', inventory_quantity: 12, option1: '40-L' },
        { id: 'v203', product_id: '102', title: '42-XL', price: '2799.00', compare_at_price: '5599.00', sku: 'AF-CHK-XL', inventory_quantity: 2, option1: '42-XL' },
      ],
      images: [{ id: 'img102', src: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800' }],
    },
    {
      id: '103',
      title: 'Pure Modal Georgette Chikankari Kurta Set',
      product_type: 'Kurti Set',
      vendor: 'Araadhya Fashion',
      handle: 'pure-modal-georgette-chikankari-kurta-set',
      tags: 'Chikankari, Modal, Kurta Set, Heavy Work, Mukaish, Luxury',
      status: 'active',
      created_at: '2026-08-25T09:15:00Z',
      variants: [
        { id: 'v301', product_id: '103', title: '38-M', price: '3499.00', compare_at_price: '6999.00', sku: 'AF-MOD-M', inventory_quantity: 18, option1: '38-M' },
        { id: 'v302', product_id: '103', title: '40-L', price: '3499.00', compare_at_price: '6999.00', sku: 'AF-MOD-L', inventory_quantity: 9, option1: '40-L' },
      ],
      images: [{ id: 'img103', src: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800' }],
    },
  ];

  private mockOrders: ShopifyOrder[] = [
    {
      id: 'ord_1001',
      name: '#AF-1081',
      order_number: 1081,
      created_at: '2026-08-26T12:00:00Z',
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      total_price: '4999.00',
      currency: 'INR',
      customer: {
        first_name: 'Priya',
        last_name: 'Sharma',
        email: 'priya.sharma@example.com',
        phone: '+919876543210',
      },
      line_items: [
        { id: 'li_1', title: 'Araadhya Royal Banarasi Silk Saree (Crimson Red / Free Size)', quantity: 1, price: '4999.00', sku: 'AF-BAN-RED' },
      ],
      shipping_address: {
        name: 'Priya Sharma',
        address1: 'Flat 402, Royal Palms, Bandra West',
        city: 'Mumbai',
        province: 'Maharashtra',
        country: 'India',
        zip: '400050',
        phone: '+919876543210',
      },
    },
    {
      id: 'ord_1002',
      name: '#AF-1080',
      order_number: 1080,
      created_at: '2026-08-25T18:45:00Z',
      financial_status: 'paid',
      fulfillment_status: 'fulfilled',
      total_price: '2799.00',
      currency: 'INR',
      customer: {
        first_name: 'Ananya',
        last_name: 'Roy',
        email: 'ananya.roy@example.com',
        phone: '+919820123456',
      },
      line_items: [
        { id: 'li_2', title: 'Handcrafted Lucknowi Chikankari Anarkali Kurti (38-M)', quantity: 1, price: '2799.00', sku: 'AF-CHK-M' },
      ],
      shipping_address: {
        name: 'Ananya Roy',
        address1: '12-B, Lake Road, Ballygunge',
        city: 'Kolkata',
        province: 'West Bengal',
        country: 'India',
        zip: '700029',
        phone: '+919820123456',
      },
      tracking_number: 'BLUEDART-984729103',
      tracking_company: 'Blue Dart Express',
      tracking_url: 'https://www.bluedart.com/tracking?track=BLUEDART-984729103',
    },
  ];

  constructor() {
    this.baseURL = `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}`;
    this.token = config.shopify.adminAccessToken;
  }

  private async getValidToken(forceRefresh = false): Promise<string> {
    const isExpired = Date.now() >= this.tokenExpiresAt;

    if (!forceRefresh && this.token && !this.token.includes('mock') && !isExpired && !config.shopify.clientId) {
      return this.token;
    }

    if (config.shopify.clientId && config.shopify.clientSecret && (forceRefresh || !this.token || isExpired || this.token.includes('mock'))) {
      try {
        const res = await axios.post(`https://${config.shopify.shopDomain}/admin/oauth/access_token`, {
          client_id: config.shopify.clientId,
          client_secret: config.shopify.clientSecret,
          grant_type: 'client_credentials',
        });
        if (res.data?.access_token) {
          this.token = res.data.access_token;
          this.tokenExpiresAt = Date.now() + ((res.data.expires_in || 86400) - 300) * 1000;
          return this.token;
        }
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to exchange Shopify Client Credentials for Access Token');
      }
    }

    return this.token;
  }

  private async getHeaders(forceRefresh = false) {
    const token = await this.getValidToken(forceRefresh);
    return {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Test API connectivity to Shopify
   */
  async testConnection(): Promise<{ success: boolean; message: string; shop?: any }> {
    if (!config.shopify.isConfigured()) {
      return {
        success: false,
        message: 'Shopify credentials not fully configured. Running in high-fidelity mock mode.',
        shop: {
          name: 'Araadhya Fashion (Simulated Store)',
          myshopify_domain: config.shopify.shopDomain || 'araadhya-fashion.myshopify.com',
          domain: 'araadhyafashion.com',
          currency: 'INR',
        },
      };
    }

    try {
      let headers = await this.getHeaders();
      let response;
      try {
        response = await axios.get(`${this.baseURL}/shop.json`, { headers, timeout: 8000 });
      } catch (err: any) {
        if (err.response?.status === 401 && config.shopify.clientId) {
          headers = await this.getHeaders(true);
          response = await axios.get(`${this.baseURL}/shop.json`, { headers, timeout: 8000 });
        } else {
          throw err;
        }
      }
      return {
        success: true,
        message: `Connected successfully to Shopify store: ${response.data.shop.name}`,
        shop: response.data.shop,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Shopify connection test failed');
      return {
        success: false,
        message: `Shopify Connection Error: ${error.response?.data?.errors || error.message}`,
      };
    }
  }

  /**
   * Fetch all products from Shopify with optional filtering
   */
  async getProducts(options?: number | { limit?: number; status?: string; title?: string }): Promise<ShopifyProduct[]> {
    let limit = 50;
    let status: string | undefined;
    let title: string | undefined;

    if (typeof options === 'number') {
      limit = options;
    } else if (typeof options === 'object' && options !== null) {
      if (options.limit !== undefined) limit = options.limit;
      status = options.status;
      title = options.title;
    }

    if (!config.shopify.isConfigured()) {
      let result = [...this.mockProducts];
      if (title) {
        const query = title.toLowerCase();
        result = result.filter(p => p.title.toLowerCase().includes(query) || p.tags?.toLowerCase().includes(query));
      }
      if (status) {
        result = result.filter(p => (p.status || 'active') === status);
      }
      return result.slice(0, limit);
    }

    try {
      const headers = await this.getHeaders();
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (status) params.append('status', status);
      if (title) params.append('title', title);

      const response = await axios.get(`${this.baseURL}/products.json?${params.toString()}`, { headers });
      return response.data.products;
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to fetch products from Shopify. Returning mock catalog.');
      return this.mockProducts;
    }
  }

  /**
   * Get single product by ID
   */
  async getProductById(productId: string | number): Promise<ShopifyProduct | null> {
    if (!config.shopify.isConfigured()) {
      const found = this.mockProducts.find(p => p.id.toString() === productId.toString());
      return found || null;
    }

    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/products/${productId}.json`, { headers });
      return response.data.product;
    } catch (error: any) {
      logger.error({ error: error.message, productId }, 'Failed to fetch product by ID');
      const found = this.mockProducts.find(p => p.id.toString() === productId.toString());
      return found || null;
    }
  }

  /**
   * Create a new product with high-res images, rich luxury copy, size variants & SEO
   */
  async createProduct(params: CreateProductParams): Promise<ShopifyProduct> {
    const defaultProductType = params.product_type || 'Chikankari Kurti';
    const rawPrice = params.variants?.[0]?.price ? parseFloat(params.variants[0].price) : 2499;

    let bodyHtml = params.body_html;
    let finalTags = params.tags || ['Chikankari', 'Traditional', 'Handcrafted', 'Luxury Wear', 'Araadhya Fashion'];

    // Automatically incorporate SEO & AEO FAQ section if requested or default
    if (params.includeSeo !== false) {
      const seo = seoEngine.generateProductSEO({
        productTitle: params.title,
        productType: defaultProductType,
        price: rawPrice,
        comparePrice: params.variants?.[0]?.compare_at_price ? parseFloat(params.variants[0].compare_at_price) : rawPrice * 2,
        color: params.color || 'Pastel',
        fabric: params.fabric || 'Pure Georgette / Modal',
        sku: params.variants?.[0]?.sku || `ARF-PRD-${Date.now().toString().slice(-4)}`,
        images: params.images?.map(img => img.src || '').filter(Boolean) || [],
      });

      if (!bodyHtml) {
        bodyHtml = `${this.generateDefaultDescription(params.title, defaultProductType, params.fabric)}\n${seo.aeoFaqSection}`;
      } else if (!bodyHtml.includes('aeo-seo-content')) {
        bodyHtml = `${bodyHtml}\n${seo.aeoFaqSection}`;
      }

      finalTags = Array.from(new Set([...finalTags, ...seo.tags]));
    } else if (!bodyHtml) {
      bodyHtml = this.generateDefaultDescription(params.title, defaultProductType, params.fabric);
    }

    const payload = {
      product: {
        title: params.title,
        body_html: bodyHtml,
        vendor: params.vendor || 'Araadhya Fashion',
        product_type: defaultProductType,
        tags: finalTags.join(', '),
        status: params.status || 'active',
        options: [{ name: 'Size' }],
        variants: params.variants || this.generateDefaultVariants('2499', '4999', 'ARF-CHK'),
        images: params.images || [],
      },
    };

    if (!config.shopify.isConfigured()) {
      const newId = `prod_${Date.now()}`;
      const mockVariants: ShopifyVariant[] = (payload.product.variants as any[]).map((v, idx) => ({
        id: `v_${Date.now()}_${idx}`,
        product_id: newId,
        title: v.title || v.option1 || 'Standard',
        price: v.price || '2499.00',
        compare_at_price: v.compare_at_price || '4999.00',
        sku: v.sku || `ARF-SKU-${idx + 1}`,
        inventory_quantity: v.inventory_quantity || 10,
        option1: v.option1 || v.title,
      }));

      const mockProduct: ShopifyProduct = {
        id: newId,
        title: payload.product.title,
        body_html: payload.product.body_html,
        vendor: payload.product.vendor,
        product_type: payload.product.product_type,
        handle: payload.product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tags: payload.product.tags,
        status: payload.product.status,
        created_at: new Date().toISOString(),
        variants: mockVariants,
        images: payload.product.images.map((img: any, i: number) => ({
          id: `img_${Date.now()}_${i}`,
          src: img.src || (img.attachment ? `data:image/jpeg;base64,${img.attachment.slice(0, 50)}...` : 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800'),
        })),
      };

      this.mockProducts.unshift(mockProduct);
      logger.info({ productId: mockProduct.id, title: mockProduct.title }, '[MOCK] Product created in memory');
      return mockProduct;
    }

    try {
      const headers = await this.getHeaders();
      const response = await axios.post(`${this.baseURL}/products.json`, payload, { headers });
      logger.info({ productId: response.data.product.id, title: response.data.product.title }, 'Product created on Shopify');
      return response.data.product;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Shopify product creation failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Update existing product
   */
  async updateProduct(productId: string | number, updates: UpdateProductParams): Promise<ShopifyProduct> {
    if (!config.shopify.isConfigured()) {
      const index = this.mockProducts.findIndex(p => p.id.toString() === productId.toString());
      if (index === -1) throw new Error(`Product with ID ${productId} not found`);

      this.mockProducts[index] = {
        ...this.mockProducts[index],
        title: updates.title || this.mockProducts[index].title,
        body_html: updates.body_html || this.mockProducts[index].body_html,
        vendor: updates.vendor || this.mockProducts[index].vendor,
        product_type: updates.product_type || this.mockProducts[index].product_type,
        tags: updates.tags ? updates.tags.join(', ') : this.mockProducts[index].tags,
        status: updates.status || this.mockProducts[index].status,
        updated_at: new Date().toISOString(),
      };
      return this.mockProducts[index];
    }

    try {
      const headers = await this.getHeaders();
      const payload: any = { product: {} };
      if (updates.title) payload.product.title = updates.title;
      if (updates.body_html) payload.product.body_html = updates.body_html;
      if (updates.vendor) payload.product.vendor = updates.vendor;
      if (updates.product_type) payload.product.product_type = updates.product_type;
      if (updates.tags) payload.product.tags = updates.tags.join(', ');
      if (updates.status) payload.product.status = updates.status;

      const response = await axios.put(`${this.baseURL}/products/${productId}.json`, payload, { headers });
      return response.data.product;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, productId }, 'Shopify product update failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Upload image to existing product
   */
  async uploadProductImage(productId: string | number, base64Image: string, altText?: string): Promise<any> {
    if (!config.shopify.isConfigured()) {
      return { id: `img_${Date.now()}`, src: `data:image/jpeg;base64,${base64Image.slice(0, 50)}...` };
    }

    try {
      const headers = await this.getHeaders();
      const payload = {
        image: {
          attachment: base64Image,
          filename: `product_${productId}_${Date.now()}.jpg`,
          alt: altText || 'Handcrafted Chikankari Outfit - Araadhya Fashion',
        },
      };

      const response = await axios.post(`${this.baseURL}/products/${productId}/images.json`, payload, { headers });
      logger.info({ productId, imageId: response.data.image?.id }, 'Successfully attached image to Shopify product');
      return response.data.image;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, productId }, 'Failed to upload product image to Shopify');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Delete or archive a product
   */
  async deleteProduct(productId: string | number): Promise<{ success: boolean; message: string }> {
    if (!config.shopify.isConfigured()) {
      const initialCount = this.mockProducts.length;
      this.mockProducts = this.mockProducts.filter(p => p.id.toString() !== productId.toString());
      if (this.mockProducts.length === initialCount) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      return { success: true, message: `Product ${productId} deleted successfully (Simulated)` };
    }

    try {
      const headers = await this.getHeaders();
      await axios.delete(`${this.baseURL}/products/${productId}.json`, { headers });
      return { success: true, message: `Product ${productId} deleted successfully from Shopify` };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, productId }, 'Shopify product deletion failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Update Variant Price, Compare Price, or Stock
   */
  async updateVariant(variantId: string | number, params: { price?: string; compare_at_price?: string; sku?: string; inventory_quantity?: number }): Promise<ShopifyVariant> {
    if (!config.shopify.isConfigured()) {
      for (const prod of this.mockProducts) {
        const vIndex = prod.variants.findIndex(v => v.id.toString() === variantId.toString());
        if (vIndex !== -1) {
          if (params.price !== undefined) prod.variants[vIndex].price = parseFloat(params.price).toFixed(2);
          if (params.compare_at_price !== undefined) prod.variants[vIndex].compare_at_price = parseFloat(params.compare_at_price).toFixed(2);
          if (params.sku !== undefined) prod.variants[vIndex].sku = params.sku;
          if (params.inventory_quantity !== undefined) prod.variants[vIndex].inventory_quantity = params.inventory_quantity;
          return prod.variants[vIndex];
        }
      }
      throw new Error(`Variant with ID ${variantId} not found`);
    }

    try {
      const headers = await this.getHeaders();
      const payload = {
        variant: {
          id: variantId,
          ...(params.price && { price: parseFloat(params.price).toFixed(2) }),
          ...(params.compare_at_price && { compare_at_price: parseFloat(params.compare_at_price).toFixed(2) }),
          ...(params.sku && { sku: params.sku }),
        },
      };

      const response = await axios.put(`${this.baseURL}/variants/${variantId}.json`, payload, { headers });
      return response.data.variant;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, variantId }, 'Shopify variant update failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Update real-time inventory quantity at a specific location
   */
  async updateInventoryLevel(inventoryItemId: string | number, locationId: string | number, availableQuantity: number): Promise<any> {
    if (!config.shopify.isConfigured()) {
      logger.info({ inventoryItemId, locationId, availableQuantity }, '[MOCK] Inventory level updated');
      return { inventory_level: { inventory_item_id: inventoryItemId, location_id: locationId, available: availableQuantity } };
    }

    try {
      const headers = await this.getHeaders();
      const payload = {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available: availableQuantity,
      };

      const response = await axios.post(`${this.baseURL}/inventory_levels/set.json`, payload, { headers });
      return response.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, inventoryItemId }, 'Shopify inventory update failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Fetch Orders from Shopify with filters
   */
  async getOrders(options: { limit?: number; status?: string; fulfillment_status?: string; financial_status?: string } = {}): Promise<ShopifyOrder[]> {
    const limit = options.limit || 50;

    if (!config.shopify.isConfigured()) {
      let orders = [...this.mockOrders];
      if (options.financial_status) {
        orders = orders.filter(o => o.financial_status === options.financial_status);
      }
      if (options.fulfillment_status) {
        orders = orders.filter(o => o.fulfillment_status === options.fulfillment_status);
      }
      return orders.slice(0, limit);
    }

    try {
      const headers = await this.getHeaders();
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('status', options.status || 'any');
      if (options.fulfillment_status) params.append('fulfillment_status', options.fulfillment_status);
      if (options.financial_status) params.append('financial_status', options.financial_status);

      const response = await axios.get(`${this.baseURL}/orders.json?${params.toString()}`, { headers });
      return response.data.orders;
    } catch (error: any) {
      logger.warn({ error: error.message }, 'Failed to fetch orders from Shopify. Returning mock orders.');
      return this.mockOrders;
    }
  }

  /**
   * Get single order by ID
   */
  async getOrderById(orderId: string | number): Promise<ShopifyOrder | null> {
    if (!config.shopify.isConfigured()) {
      const found = this.mockOrders.find(o => o.id.toString() === orderId.toString() || o.name.toLowerCase() === orderId.toString().toLowerCase());
      return found || null;
    }

    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseURL}/orders/${orderId}.json`, { headers });
      return response.data.order;
    } catch (error: any) {
      logger.error({ error: error.message, orderId }, 'Failed to fetch order by ID');
      const found = this.mockOrders.find(o => o.id.toString() === orderId.toString());
      return found || null;
    }
  }

  /**
   * Create an order in Shopify
   */
  async createOrder(params: CreateOrderParams): Promise<ShopifyOrder> {
    if (!config.shopify.isConfigured()) {
      const newOrderNum = 1080 + this.mockOrders.length + 1;
      const mockOrder: ShopifyOrder = {
        id: `ord_${Date.now()}`,
        name: `#AF-${newOrderNum}`,
        order_number: newOrderNum,
        created_at: new Date().toISOString(),
        financial_status: params.financial_status || 'paid',
        fulfillment_status: 'unfulfilled',
        total_price: params.line_items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0).toFixed(2),
        currency: 'INR',
        customer: {
          first_name: params.shipping_address?.first_name || 'Valued',
          last_name: params.shipping_address?.last_name || 'Customer',
          email: params.email,
          phone: params.phone || params.shipping_address?.phone,
        },
        line_items: params.line_items.map((li, idx) => ({
          id: `li_${Date.now()}_${idx}`,
          title: li.title,
          quantity: li.quantity,
          price: li.price,
        })),
        shipping_address: params.shipping_address ? {
          name: `${params.shipping_address.first_name} ${params.shipping_address.last_name || ''}`.trim(),
          address1: params.shipping_address.address1,
          city: params.shipping_address.city,
          province: params.shipping_address.province,
          country: params.shipping_address.country,
          zip: params.shipping_address.zip,
          phone: params.shipping_address.phone,
        } : undefined,
      };

      this.mockOrders.unshift(mockOrder);
      logger.info({ orderId: mockOrder.id, name: mockOrder.name }, '[MOCK] Shopify Order created successfully');
      return mockOrder;
    }

    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${this.baseURL}/orders.json`,
        { order: params },
        { headers }
      );
      return response.data.order;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Shopify order creation failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Fulfill order with courier tracking and notification
   */
  async fulfillOrder(params: FulfillOrderParams): Promise<{ success: boolean; fulfillment: any }> {
    const { orderId, trackingNumber, trackingCompany = 'Blue Dart Express', trackingUrl, notifyCustomer = true } = params;

    if (!config.shopify.isConfigured()) {
      const order = this.mockOrders.find(o => o.id.toString() === orderId.toString() || o.name.toLowerCase() === orderId.toString().toLowerCase());
      if (order) {
        order.fulfillment_status = 'fulfilled';
        order.tracking_number = trackingNumber;
        order.tracking_company = trackingCompany;
        order.tracking_url = trackingUrl || `https://track.courier.in/${trackingNumber}`;
      }
      return {
        success: true,
        fulfillment: {
          id: `ful_${Date.now()}`,
          order_id: orderId,
          status: 'success',
          tracking_number: trackingNumber,
          tracking_company: trackingCompany,
          tracking_url: trackingUrl || `https://track.courier.in/${trackingNumber}`,
          notify_customer: notifyCustomer,
        },
      };
    }

    try {
      const headers = await this.getHeaders();
      const fulfillmentPayload = {
        fulfillment: {
          message: 'Your Araadhya Fashion order has been carefully packed and dispatched!',
          notify_customer: notifyCustomer,
          tracking_info: {
            number: trackingNumber,
            company: trackingCompany,
            url: trackingUrl || `https://www.google.com/search?q=${encodeURIComponent(trackingCompany + ' ' + trackingNumber)}`,
          },
          ...(params.lineItems && { line_items: params.lineItems }),
        },
      };

      const response = await axios.post(`${this.baseURL}/orders/${orderId}/fulfillments.json`, fulfillmentPayload, { headers });
      logger.info({ orderId, trackingNumber }, 'Shopify order fulfilled successfully');
      return { success: true, fulfillment: response.data.fulfillment };
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message, orderId }, 'Shopify order fulfillment failed');
      throw new Error(error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : error.message);
    }
  }

  /**
   * Get High-Level Store Summary & Inventory Metrics
   */
  async getStoreSummary(): Promise<StoreSummary> {
    const isLive = config.shopify.isConfigured();
    const products = await this.getProducts({ limit: 100 });
    const orders = await this.getOrders({ limit: 100 });

    let totalVariants = 0;
    let lowStockVariants = 0;
    let activeProducts = 0;

    for (const prod of products) {
      if (prod.status === 'active' || !prod.status) activeProducts++;
      if (prod.variants) {
        totalVariants += prod.variants.length;
        for (const v of prod.variants) {
          if (v.inventory_quantity !== undefined && v.inventory_quantity <= 5) {
            lowStockVariants++;
          }
        }
      }
    }

    const unfulfilledOrders = orders.filter(o => o.fulfillment_status === 'unfulfilled' || !o.fulfillment_status).length;
    const paidOrders = orders.filter(o => o.financial_status === 'paid').length;

    return {
      totalProducts: products.length,
      activeProducts,
      totalVariants,
      lowStockVariants,
      totalOrders: orders.length,
      unfulfilledOrders,
      paidOrders,
      isLive,
      storeName: 'Araadhya Fashion',
      storeDomain: config.shopify.shopDomain || 'araadhya-fashion.myshopify.com',
    };
  }

  /**
   * Bulk publish all image files from a local folder to Shopify
   */
  async bulkPublishFromFolder(options: BulkUploadFolderOptions): Promise<{ total: number; published: any[]; errors: any[] }> {
    const { folderPath, defaultPrice = 2499, compareAtPrice = 4999, productType = 'Chikankari Kurti', fabric = 'Pure Georgette' } = options;

    if (!fs.existsSync(folderPath)) {
      throw new Error(`Directory does not exist: ${folderPath}`);
    }

    const files = fs.readdirSync(folderPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    let imageFiles = files.filter((file) => imageExtensions.includes(path.extname(file).toLowerCase()));

    if (options.limit && options.limit > 0) {
      imageFiles = imageFiles.slice(0, options.limit);
    }

    if (imageFiles.length === 0) {
      return { total: 0, published: [], errors: [{ error: `No image files found in ${folderPath}` }] };
    }

    logger.info({ count: imageFiles.length, folderPath }, 'Starting bulk upload to Shopify');

    const published: any[] = [];
    const errors: any[] = [];
    const sizes = options.sizes || ['36-S', '38-M', '40-L', '42-XL', '44-XXL', '46-3XL', 'FREE SIZE'];
    const tempDir = path.join(process.cwd(), '.temp_upload_cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      let filePath = path.join(folderPath, file);
      const ext = path.extname(file).toLowerCase();
      const rawName = path.parse(file).name;

      const formattedTitle = this.formatProductTitle(rawName, productType);
      const skuBase = `ARF-CHK-${Date.now().toString().slice(-4)}${i + 1}`;

      try {
        let uploadFilename = file;

        if (ext === '.heic') {
          const convertedPath = path.join(tempDir, `${rawName}.jpg`);
          try {
            execSync(`sips -s format jpeg "${filePath}" --out "${convertedPath}" > /dev/null 2>&1`);
            filePath = convertedPath;
            uploadFilename = `${rawName}.jpg`;
          } catch (convErr: any) {
            logger.warn({ convErr: convErr.message }, 'sips HEIC conversion fallback');
          }
        }

        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        const variants = sizes.map((size) => ({
          title: size,
          option1: size,
          price: defaultPrice.toFixed(2),
          compare_at_price: compareAtPrice.toFixed(2),
          sku: `${skuBase}-${size}`,
          inventory_quantity: 10,
          inventory_management: 'shopify',
        }));

        const product = await this.createProduct({
          title: formattedTitle,
          product_type: productType,
          vendor: 'Araadhya Fashion',
          fabric: fabric,
          includeSeo: true,
          variants,
          images: [
            {
              attachment: base64Image,
              filename: uploadFilename,
            },
          ],
        });

        published.push({
          id: product.id,
          title: product.title,
          url: `https://${config.shopify.shopDomain}/products/${product.handle}`,
          adminUrl: `https://admin.shopify.com/store/araadhyafashion/products/${product.id}`,
          variantsCount: product.variants?.length || 0,
        });

        logger.info(`[${i + 1}/${imageFiles.length}] Successfully published: ${formattedTitle}`);
      } catch (err: any) {
        logger.error({ file, error: err.message }, `Failed to publish ${file}`);
        errors.push({ file, error: err.message });
      }
    }

    return { total: imageFiles.length, published, errors };
  }

  /**
   * Helper: Format clean product title
   */
  private formatProductTitle(rawName: string, productType: string): string {
    const clean = rawName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

    if (clean.toLowerCase().includes('chikankari')) {
      return `Araadhya Handcrafted ${clean}`;
    }
    return `Araadhya Handcrafted ${clean} Lucknowi Chikankari ${productType}`;
  }

  /**
   * Helper: Generate high-converting luxury description following House of Chikankari & ADA benchmarks
   */
  private generateDefaultDescription(title: string, productType = 'Chikankari Kurti', fabric = 'Pure Georgette / Modal'): string {
    return `
      <div class="product-description" style="font-family: inherit; line-height: 1.6; color: #2d3748;">
        <p style="font-size: 16px; margin-bottom: 16px;">
          Embrace timeless royal grace with our <strong>${title}</strong>. Meticulously hand-embroidered by generational women artisans in Lucknow, this heirloom piece represents over <strong>32 hours of intricate needlecraft</strong>, capturing the regal grandeur of authentic Awadhi heritage.
        </p>

        <h4 style="margin-top: 18px; margin-bottom: 8px; color: #780016; font-size: 16px;">✨ Craftsmanship & Artisan Highlights:</h4>
        <ul style="margin-bottom: 16px; padding-left: 20px;">
          <li><strong>Authentic Heritage Embroidery:</strong> Featuring master <em>Bakhiya</em> (shadow work), <em>Phanda</em> (pearl knotting), and <em>Keel Kangan</em> floral motifs.</li>
          <li><strong>Fabric:</strong> 100% Breathable ${fabric} — feather-soft handfeel with an ultra-graceful drape.</li>
          <li><strong>Transparency & Slip:</strong> Semi-sheer festive weave. Pairs effortlessly with a matching cotton inner slip.</li>
          <li><strong>Length:</strong> 45" to 46" standard calf length.</li>
          <li><strong>Occasion:</strong> Festive poojas, weddings, daytime gatherings, luxury brunches, and graceful evening wear.</li>
        </ul>

        <h4 style="margin-top: 22px; margin-bottom: 10px; color: #780016; font-size: 16px;">📏 Official Sizing Chart (in Inches):</h4>
        <div style="overflow-x: auto; margin-bottom: 18px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: center; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background-color: #f8fafc; color: #780016; font-weight: bold; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Size</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Bust</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Waist</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Hip</th>
                <th style="padding: 10px; border: 1px solid #e2e8f0;">Length</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">36 - S</td><td style="padding: 8px; border: 1px solid #e2e8f0;">36"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">32"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">38"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">45"</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">38 - M</td><td style="padding: 8px; border: 1px solid #e2e8f0;">38"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">34"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">40"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">45"</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">40 - L</td><td style="padding: 8px; border: 1px solid #e2e8f0;">40"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">36"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">42"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">45"</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">42 - XL</td><td style="padding: 8px; border: 1px solid #e2e8f0;">42"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">38"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">44"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">45"</td></tr>
              <tr><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">44 - XXL</td><td style="padding: 8px; border: 1px solid #e2e8f0;">44"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">40"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">46"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">46"</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 600;">46 - 3XL</td><td style="padding: 8px; border: 1px solid #e2e8f0;">46"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">42"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">48"</td><td style="padding: 8px; border: 1px solid #e2e8f0;">46"</td></tr>
            </tbody>
          </table>
        </div>

        <h4 style="margin-top: 18px; margin-bottom: 8px; color: #780016; font-size: 16px;">🧼 Care Instructions:</h4>
        <p style="margin-bottom: 12px;">Gentle hand wash in cold water or professional dry clean recommended to retain handmade embroidery brilliance and fabric lustre.</p>

        <p style="margin-top: 20px; font-style: italic; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <em>*Each Araadhya Fashion garment is authentically hand-embroidered by artisan women in Lucknow. Slight motif variations celebrate its true handmade heritage.</em>
        </p>
      </div>
    `.trim();
  }

  /**
   * Helper: Generate default variants
   */
  private generateDefaultVariants(price: string, compareAt: string, skuPrefix: string) {
    const sizes = ['36-S', '38-M', '40-L', '42-XL', '44-XXL', '46-3XL', 'FREE SIZE'];
    return sizes.map((size) => ({
      title: size,
      option1: size,
      price: parseFloat(price).toFixed(2),
      compare_at_price: parseFloat(compareAt).toFixed(2),
      sku: `${skuPrefix}-${size}`,
      inventory_quantity: 10,
    }));
  }

  /**
   * Verify Shopify Webhook HMAC signature
   */
  verifyWebhook(data: string | Buffer, hmacHeader: string): boolean {
    if (!config.shopify.webhookSecret) return true;
    const hash = crypto
      .createHmac('sha256', config.shopify.webhookSecret)
      .update(data)
      .digest('base64');
    return hash === hmacHeader;
  }
}

export const shopifyService = new ShopifyService();
