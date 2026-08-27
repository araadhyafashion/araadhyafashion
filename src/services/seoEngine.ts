export interface SEOMetadata {
  title: string;
  metaDescription: string;
  tags: string[];
  jsonLdSchema: Record<string, any>;
  aeoFaqSection: string;
  keywords: string[];
}

export class SEOEngineService {
  /**
   * Generate High-Impact SEO & AEO (Answer Engine Optimization) content for Chikankari & Ethnic Fashion
   */
  generateProductSEO(params: {
    productTitle: string;
    productType: string;
    price: number;
    comparePrice?: number;
    color?: string;
    fabric?: string;
    sku: string;
    images: string[];
  }): SEOMetadata {
    const {
      productTitle,
      productType = 'Chikankari Kurti',
      price,
      comparePrice = price * 2,
      color = 'Pastel',
      fabric = 'Premium Georgette / Modal Cotton',
      sku,
      images,
    } = params;

    const brand = 'Araadhya Fashion';
    const storeUrl = 'https://araadhyafashion.com';

    // 1. Target Keywords for Google, Meta Ads & AI Search Engines (Perplexity, ChatGPT, Gemini)
    const keywords = [
      `buy ${productTitle.toLowerCase()} online`,
      `authentic lucknowi chikankari ${productType.toLowerCase()}`,
      `handcrafted ${fabric.toLowerCase()} ${productType.toLowerCase()}`,
      `designer ethnic wear india`,
      `araadhya fashion ${productType.toLowerCase()}`,
      `traditional chikankari embroidery`,
      `wedding festive ethnic wear`,
    ];

    // 2. High-CTR Meta Title & Description
    const title = `${productTitle} | Authentic Lucknowi Chikankari | ${brand}`;
    const metaDescription = `Shop authentic ${productTitle} in ${fabric}. Handcrafted by master artisans in Lucknow with intricate Bakhiya & Phanda stitches. Free Shipping & Cash on Delivery available at ${brand}.`;

    // 3. AEO (Answer Engine Optimization) FAQ & Semantic Content
    const aeoFaqSection = `
      <div class="aeo-seo-content" style="margin-top: 24px; border-top: 1px solid #E2E8F0; padding-top: 18px;">
        <h4 style="color: #780016; font-size: 16px; margin-bottom: 12px;">🌟 Frequently Asked Questions & Styling Advice</h4>
        
        <div style="margin-bottom: 14px;">
          <p style="font-weight: 700; color: #1E293B; margin-bottom: 4px;">Q: Is this authentic Lucknowi Chikankari?</p>
          <p style="color: #475569; font-size: 14px;">A: Yes, every Araadhya Fashion garment is 100% authentically hand-embroidered by certified heritage artisans in Lucknow using traditional stitches like Bakhiya, Phanda, and Keel Kangan.</p>
        </div>

        <div style="margin-bottom: 14px;">
          <p style="font-weight: 700; color: #1E293B; margin-bottom: 4px;">Q: How should I style this ${productType}?</p>
          <p style="color: #475569; font-size: 14px;">A: Pair this exquisite ${color} ${productType} with matching Chikankari palazzos or cigarette pants, oxidized silver jhumkas, and handcrafted mojris for an effortless royal ethnic look.</p>
        </div>

        <div style="margin-bottom: 14px;">
          <p style="font-weight: 700; color: #1E293B; margin-bottom: 4px;">Q: How do I choose my size?</p>
          <p style="color: #475569; font-size: 14px;">A: We recommend selecting your standard bust size (sizes 36-S to 46-3XL). For a relaxed flowy drape, you may opt for one size larger.</p>
        </div>
      </div>
    `.trim();

    // 4. Schema.org JSON-LD for Google Rich Results (Merchant Shopping Graph)
    const jsonLdSchema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: productTitle,
      image: images,
      description: metaDescription,
      sku: sku,
      brand: {
        '@type': 'Brand',
        name: brand,
      },
      offers: {
        '@type': 'Offer',
        url: `${storeUrl}/products/${productTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        priceCurrency: 'INR',
        price: price.toFixed(2),
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: brand,
        },
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '38',
      },
    };

    const tags = [
      'Chikankari',
      'Lucknowi',
      'Handcrafted',
      'Ethnic Wear',
      'Festive Collection',
      'Araadhya Fashion',
      productType,
      color,
    ];

    return {
      title,
      metaDescription,
      tags,
      jsonLdSchema,
      aeoFaqSection,
      keywords,
    };
  }
}

export const seoEngine = new SEOEngineService();
