export interface ParsedVendorProduct {
  title: string;
  wholesalePrice: number;
  retailPrice: number; // 2x markup rounded to 99
  compareAtPrice: number; // 4x compare-at for high perceived value
  sizes: string[];
  fabric: string;
  category: string;
  rawCaption: string;
}

export class VendorParserService {
  /**
   * Parse vendor message text/caption and extract structured product details
   */
  parseVendorMessage(caption: string): ParsedVendorProduct {
    const text = (caption || '').trim();

    // 1. Extract Wholesale Price using multi-pattern regex
    const wholesalePrice = this.extractPrice(text) || 850;

    // 2. 2x Pricing Formula: Selling Price = (Wholesale * 2) rounded to nearest 99
    // e.g. 850 * 2 = 1700 -> 1699
    const rawRetail = wholesalePrice * 2;
    const retailPrice = Math.round(rawRetail / 100) * 100 - 1;

    // 3. Compare-At Price = 4x Wholesale (shows ~50% discount badge)
    const rawCompare = wholesalePrice * 4;
    const compareAtPrice = Math.round(rawCompare / 100) * 100 - 1;

    // 4. Extract Sizes
    const sizes = this.extractSizes(text);

    // 5. Extract Fabric & Category
    const fabric = this.extractFabric(text);
    const category = this.extractCategory(text);

    // 6. Generate High-Converting Luxury Title
    const title = this.generateLuxuryTitle(fabric, category, text);

    return {
      title,
      wholesalePrice,
      retailPrice,
      compareAtPrice,
      sizes,
      fabric,
      category,
      rawCaption: text,
    };
  }

  /**
   * Price extractor with support for "Rate 850", "850/-", "Rs 850", "₹850", "850 plus ship"
   */
  private extractPrice(text: string): number | null {
    const patterns = [
      /(?:rate|price|rs\.?|inr|₹)\s*[:=-]?\s*(\d{3,5})/i,
      /(\d{3,5})\s*(?:\/\-|\/—|\+ship|\+gst|rs|inr)/i,
      /\b(\d{3,4})\b/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        // Valid fashion piece range (between ₹250 and ₹25,000)
        if (num >= 250 && num <= 25000) {
          return num;
        }
      }
    }
    return null;
  }

  /**
   * Extract sizes from text (e.g., "38-46", "38 to 44", "M to XXL", "Free Size")
   */
  private extractSizes(text: string): string[] {
    const lower = text.toLowerCase();

    if (lower.includes('free size') || lower.includes('freesize')) {
      return ['FREE SIZE'];
    }

    // Check for range like "38-46", "38 to 46", "36-44", "38-44"
    const rangeMatch = lower.match(/(?:sizes?|size)?\s*(36|38|40)\s*(?:-|to)\s*(42|44|46|48)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1], 10);
      const max = parseInt(rangeMatch[2], 10);
      const sizeMap: Record<number, string> = {
        36: '36-S',
        38: '38-M',
        40: '40-L',
        42: '42-XL',
        44: '44-XXL',
        46: '46-3XL',
        48: '48-4XL',
      };
      const result: string[] = [];
      for (let s = min; s <= max; s += 2) {
        if (sizeMap[s]) result.push(sizeMap[s]);
      }
      if (result.length > 0) return result;
    }

    const result: string[] = [];
    if (lower.includes('36')) result.push('36-S');
    if (lower.includes('38')) result.push('38-M');
    if (lower.includes('40')) result.push('40-L');
    if (lower.includes('42')) result.push('42-XL');
    if (lower.includes('44')) result.push('44-XXL');
    if (lower.includes('46')) result.push('46-3XL');
    if (result.length > 0) return result;

    // Default standard full size range
    return ['36-S', '38-M', '40-L', '42-XL', '44-XXL', '46-3XL'];
  }

  /**
   * Identify fabric from text
   */
  private extractFabric(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('georgette')) return 'Pure Georgette';
    if (lower.includes('modal') || lower.includes('modal silk')) return 'Modal Silk';
    if (lower.includes('mulmul') || lower.includes('mul mul')) return 'Mulmul Cotton';
    if (lower.includes('chanderi')) return 'Chanderi Silk';
    if (lower.includes('organza')) return 'Pure Organza';
    if (lower.includes('cotton')) return 'Pure Cotton';
    if (lower.includes('rayon')) return 'Premium Rayon';
    if (lower.includes('silk')) return 'Silk Blend';
    return 'Premium Handcrafted Fabric';
  }

  /**
   * Identify category from text
   */
  private extractCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('anarkali')) return 'Chikankari Anarkali Set';
    if (lower.includes('saree') || lower.includes('sari')) return 'Handcrafted Chikankari Saree';
    if (lower.includes('angrakha')) return 'Chikankari Angrakha Kurti';
    if (lower.includes('short kurti') || lower.includes('short top')) return 'Chikankari Short Kurti';
    if (lower.includes('plazo') || lower.includes('palazzo') || lower.includes('pant') || lower.includes('set') || lower.includes('dupatta')) {
      return 'Chikankari Kurta & Palazzo Set';
    }
    return 'Lucknowi Chikankari Kurti';
  }

  /**
   * Generate high-converting luxury product title following House of Chikankari & ADA benchmarks
   */
  private generateLuxuryTitle(fabric: string, category: string, rawText: string): string {
    const lower = rawText.toLowerCase();
    
    // Royal Heritage prefixes
    const prefixes = ['Nazakat', 'Noor', 'Riwayat', 'Jharokha', 'Gulbahar', 'Aafreen', 'Zohra'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];

    let embellishment = '';
    if (lower.includes('mukaish') || lower.includes('kamdani')) embellishment = 'with Real Mukaish Work';
    else if (lower.includes('gota') || lower.includes('gota patti')) embellishment = 'with Gota Patti Borders';
    else if (lower.includes('sequin') || lower.includes('sequence')) embellishment = 'with Delicate Shimmer Sequins';
    else if (lower.includes('shadow') || lower.includes('bakhiya')) embellishment = 'with Intricate Bakhiya Stitches';
    else embellishment = 'Hand-Embroidered Luxury Edition';

    return `Araadhya ${prefix} Handcrafted ${fabric} ${category} ${embellishment}`.trim();
  }
}

export const vendorParser = new VendorParserService();

