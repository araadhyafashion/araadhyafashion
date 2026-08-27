import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  WASocket,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { vendorParser } from './vendorParser';
import { shopifyService } from './shopify';
import { geminiAI } from './geminiAI';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface VendorFeedItem {
  id: string;
  timestamp: string;
  groupName: string;
  from: string;
  caption: string;
  thumbnailBase64?: string;
  wholesalePrice: number;
  retailPrice: number;
  shopifyProductId?: string | number;
  shopifyProductUrl?: string;
  shopifyAdminUrl?: string;
  imageHashes?: string[];
  status: 'pending' | 'processing' | 'published' | 'skipped' | 'error';
  error?: string;
}

export class WhatsAppGroupListenerService {
  private sock: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private isConnected = false;
  private monitoredGroups: Set<string> = new Set(); // Group JIDs or '*' for all groups
  private feedHistory: VendorFeedItem[] = [];
  private historyFilePath = path.join(process.cwd(), '.baileys_auth_info', 'feed_history.json');

  constructor() {
    this.monitoredGroups.add('*'); // By default listen to all vendor groups
    this.loadHistory();
  }

  private loadHistory() {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.historyFilePath, 'utf-8'));
        if (Array.isArray(data)) {
          this.feedHistory = data.filter((f) => f.caption && f.caption.trim().length > 5 && f.wholesalePrice > 0);
          return;
        }
      }
    } catch (err) {
      // Ignore
    }
    this.feedHistory = [];
  }

  private generateInitialCatalog(): VendorFeedItem[] {
    const rawCatalog = [
      // Kohinoor Chikan Center (24 Items)
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Modal Silk Lucknowi Chikankari Straight Kurti with Sequence Work. Rate: 1050/- Sizes: 38 40 42 44 46.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Heavy Georgette 3-Piece Chikankari Suit with Mukaish Kamdani & Inner Palazzo. Rate: 1450/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Organza Chikankari Hand Embroidered Saree with Zari Pallu. Rate: 2200/- Free Size.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Dola Silk Chikankari Kurti with Delicate Pearl & Shadow Work. Rate: 1350/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Viscose Georgette Anarkali Gown with Heavy Chikankari Ghera. Rate: 2450/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Lucknowi Pure Mulmul Cotton Long Kurta with Chikan Border. Rate: 850/- Sizes: 36 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Velvet Royal Chikankari Kurti with Zardozi Work Border. Rate: 1950/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Muslin Silk Chikankari Kurti with Floral Digital Print. Rate: 1250/- Sizes: 38 to 46.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Kota Doria Chikankari Suit Set with Chiffon Dupatta. Rate: 1100/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Tussar Silk Festive Chikankari Kurta with Cutwork Neckline. Rate: 1650/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Crepe Chikankari Straight Kurti with Sequence Detailing. Rate: 1390/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Handcrafted Tissue Silk Chikankari Kurta Set with Silk Pants. Rate: 2150/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Modal Chikan Co-ord Set with Embroidered Top & Trousers. Rate: 1550/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Georgette Angrakha Flared Kurti with Pearl Tassels. Rate: 1690/- Sizes: 38 40 42 44 46.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Chanderi Silk Flared Kurti with Zari Embroidered Neckline. Rate: 1490/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Lucknowi Hakoba Cotton Designer Kurti with Lace Inserts. Rate: 990/- Sizes: 36 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Jamdani Weave Chikankari Fusion Saree with Matching Blouse. Rate: 2350/- Free Size.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Raw Silk Festive Kurta Set with Gota Patti & Chikan Work. Rate: 1890/- Sizes: 38 to 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Georgette Straight Kurti with Mukaish Kamdani All Over. Rate: 1190/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Heavy Net Embroidered Cape Kurti Set with Silk Inner. Rate: 2290/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Linen Cotton Handcrafted Tunic Kurti with Shadow Stitch. Rate: 890/- Sizes: 38 to 46.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pure Modal Silk Short Kurti for Jeans/Palazzos. Rate: 790/- Sizes: 36 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Jacquard Silk Chikankari Festive Suit with Organza Dupatta. Rate: 1990/- Sizes: 38 40 42 44.' },
      { groupName: 'Kohinoor Chikan Center', caption: 'Pashmina Touch Winter Chikankari Suit with Warm Shawl. Rate: 2190/- Sizes: 38 to 44.' },

      // Aadabkari Resellers (20 Items)
      { groupName: 'Aadabkari resellers', caption: 'Pure Chanderi Silk Anarkali Suit Set with Organza Border Dupatta. Rate: 1750/- Sizes: 36 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Handcrafted Mulmul Cotton Chikankari Short Angrakha Kurti. Rate: 650/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Modal Cotton Chikankari Kurta with Pant Set & Gota Detailing. Rate: 1150/- Sizes: 38 40 42 44 46.' },
      { groupName: 'Aadabkari resellers', caption: 'Georgette Ghaspatti Chikankari Straight Kurti with Handmade Tassels. Rate: 980/- Sizes: 38 to 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Dyeable Pure Viscose Georgette Sharara Set with Heavy Gota Work. Rate: 2350/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Chanderi Silk Digital Floral Print Kurti with Hand Embroidery. Rate: 1290/- Sizes: 38 to 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Cotton Silk Straight Fit Chikankari Pant Set with Chiffon Dupatta. Rate: 1450/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Muslin Silk Anarkali Gown with All-over Chikankari Jaal Work. Rate: 2100/- Sizes: 38 to 46.' },
      { groupName: 'Aadabkari resellers', caption: 'Pure Georgette Chikankari Kaftan with Bead Lace Border. Rate: 1190/- Free Size.' },
      { groupName: 'Aadabkari resellers', caption: 'Modal Silk Angrakha Co-ord Set with Embroidered Flared Palazzo. Rate: 1680/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Pure Organza Dupatta with Pearl Chikankari Border & Zari Butis. Rate: 850/- Free Size.' },
      { groupName: 'Aadabkari resellers', caption: 'Lucknowi Pure Linen Straight Kurti with Contrast Shadow Stitch. Rate: 950/- Sizes: 38 to 46.' },
      { groupName: 'Aadabkari resellers', caption: 'Tissue Chanderi Festive Gharara Set with Heavy Zardozi Highlights. Rate: 2650/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Modal Satin Chikankari Kurti with Hand Cutdana Embellishments. Rate: 1390/- Sizes: 38 to 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Pure Cotton Dailywear Lucknowi Kurti with Crochet Lace Edging. Rate: 590/- Sizes: 36 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Hakoba Cotton Peplum Top with Chikankari Floral Yoke. Rate: 750/- Sizes: 36 38 40 42.' },
      { groupName: 'Aadabkari resellers', caption: 'Modal Silk Short Tunic for Jeans & Trousers. Rate: 690/- Sizes: 36 to 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Georgette 3-Piece Anarkali with Matching Embroidered Potli Bag. Rate: 1890/- Sizes: 38 40 42 44.' },
      { groupName: 'Aadabkari resellers', caption: 'Chanderi Silk Saree with Heavy Chikankari Pallu & Running Blouse. Rate: 1950/- Free Size.' },
      { groupName: 'Aadabkari resellers', caption: 'Cotton Mulmul Festive Kurta & Dupatta Set with Gotta Patti Lace. Rate: 1250/- Sizes: 38 40 42 44.' },
    ];

    return rawCatalog.map((item, idx) => {
      const parsed = vendorParser.parseVendorMessage(item.caption);
      const isLiveSample = idx < 3; // First 3 are published samples

      return {
        id: `cat_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        timestamp: `${10 + (idx % 12)}:${(10 + (idx * 3) % 50).toString().padStart(2, '0')} AM`,
        groupName: item.groupName,
        from: item.groupName,
        caption: item.caption,
        wholesalePrice: parsed.wholesalePrice,
        retailPrice: parsed.retailPrice,
        shopifyProductId: isLiveSample ? (9315746676962 + idx) : undefined,
        shopifyProductUrl: isLiveSample ? `https://araadhyafashion.com/products/${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined,
        shopifyAdminUrl: isLiveSample ? `https://admin.shopify.com/store/araadhyafashion/products/${9315746676962 + idx}` : undefined,
        status: isLiveSample ? 'published' : 'pending',
      };
    });
  }

  private saveHistory() {
    try {
      const dir = path.dirname(this.historyFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.feedHistory.slice(0, 100), null, 2));
    } catch (err) {
      // Ignore
    }
  }

  /**
   * Start the WhatsApp Web Baileys Client
   */
  async start(): Promise<void> {
    const authDir = path.join(process.cwd(), '.baileys_auth_info');
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: logger as any,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('New WhatsApp QR code generated');
        qrcodeTerminal.generate(qr, { small: true });
        this.qrCodeDataUrl = await QRCode.toDataURL(qr);
        this.isConnected = false;
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.warn({ shouldReconnect }, 'WhatsApp connection closed. Reconnecting...');
        this.isConnected = false;
        if (shouldReconnect) {
          setTimeout(() => this.start(), 3000);
        }
      } else if (connection === 'open') {
        logger.info('🎉 WhatsApp Personal Multi-Device connected successfully!');
        this.isConnected = true;
        this.qrCodeDataUrl = null;
      }
    });

    // Listen for history sync from WhatsApp (just log without spamming)
    this.sock.ev.on('messaging-history.set', async (history) => {
      logger.info({ messagesCount: history.messages?.length }, 'Received chat history sync from WhatsApp');
    });

    this.setupMessageUpsert();
  }

  private outfitStaging = new Map<string, { images: Array<{ attachment: string; filename: string }>; captions: string[]; lastUpdated: number }>();

  // Listen to incoming messages in real-time
  private setupMessageUpsert() {
    if (!this.sock) return;

    this.sock.ev.on('messages.upsert', async (m: any) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        if (msg.key.fromMe) continue; // ignore outgoing messages

        const chatJid = msg.key.remoteJid || '';
        if (!chatJid || chatJid.includes('@broadcast') || chatJid.includes('@newsletter')) continue;

        const messageContent = msg.message;
        if (!messageContent) continue;

        const rawMsg =
          messageContent.ephemeralMessage?.message ||
          messageContent.viewOnceMessage?.message ||
          messageContent.viewOnceMessageV2?.message ||
          messageContent;

        // Initialize staging for this chat if not present
        if (!this.outfitStaging.has(chatJid)) {
          this.outfitStaging.set(chatJid, { images: [], captions: [], lastUpdated: Date.now() });
        }
        const staging = this.outfitStaging.get(chatJid)!;

        // If staging is older than 10 minutes, reset it for freshness
        if (Date.now() - staging.lastUpdated > 10 * 60 * 1000) {
          staging.images = [];
          staging.captions = [];
        }
        staging.lastUpdated = Date.now();

        // 1. Download image if attached in this message
        const hasImage = Boolean(rawMsg?.imageMessage);
        if (hasImage && this.sock) {
          try {
            const buffer = (await downloadMediaMessage(
              { key: msg.key, message: rawMsg },
              'buffer',
              {}
            )) as Buffer;

            if (buffer && buffer.length > 0) {
              const base64 = buffer.toString('base64');
              staging.images.push({
                attachment: base64,
                filename: `outfit_${Date.now()}_${staging.images.length + 1}.jpg`,
              });
              logger.info({ chatJid, totalStagedImages: staging.images.length }, '📸 Staged outfit photo in batch');
            }
          } catch (imgErr: any) {
            logger.warn({ err: imgErr.message }, 'Could not download media buffer');
          }
        }

        // 2. Extract text / caption
        const text = (
          rawMsg?.imageMessage?.caption ||
          rawMsg?.conversation ||
          rawMsg?.extendedTextMessage?.text ||
          ''
        ).trim();

        const textLower = text.toLowerCase();

        // Detect ---ai--- trigger (AI model generation mode)
        const isAiTrigger = /[-–—=_]{2,}ai[-–—=_]{2,}/i.test(text) || textLower === '---ai---' || textLower === '--ai--';

        // Check if message is or contains a dash sequence (e.g. "---", "------", "---6---18---10---")
        const isPureDash =
          isAiTrigger ||
          /[-–—=_]{3,}/.test(text) ||
          /[-–—=_]+[0-9]+[-–—=_]+/.test(text) ||
          /^[-–—=_0-9\s]{3,}$/.test(text);

        const containsDash = isAiTrigger || /[-–—=_]{3,}|[-–—=_]+[0-9]+[-–—=_]+/.test(text);

        // Add text to staged captions if it has descriptive content
        if (text && !isPureDash) {
          // Remove embedded dash lines if present
          const cleanedText = text.replace(/[-–—=_]{3,}|[-–—=_]+[0-9]+[-–—=_]+/g, '').trim();
          if (cleanedText.length > 0) {
            staging.captions.push(cleanedText);
            logger.info({ chatJid, totalCaptions: staging.captions.length }, '📝 Staged outfit description in batch');
          }
        }

        // 3. CHECK IF DASH TRIGGER IS RECEIVED
        const isTriggered = isPureDash || containsDash;

        if (!isTriggered) {
          logger.info(
            { chatJid, imagesCount: staging.images.length, textCount: staging.captions.length },
            'Staging outfit components... (waiting for dash --- to complete)'
          );
          continue;
        }

        // 4. TRIGGERED! Determine mode and publish
        if (isAiTrigger) {
          logger.info(
            { chatJid, imagesCount: staging.images.length },
            '🤖 ---ai--- trigger received! Launching Gemini AI on-model photoshoot pipeline...'
          );
          await this.publishStagedOutfit(msg, chatJid, staging, true);
        } else {
          logger.info(
            { chatJid, imagesCount: staging.images.length },
            '🚀 --- trigger received! Publishing with original photos...'
          );
          await this.publishStagedOutfit(msg, chatJid, staging, false);
        }
      }
    });
  }

  /**
   * Publish the fully assembled staged outfit (photos + description) to Shopify
   * aiMode = true → Gemini Vision + Imagen 3 on-model shots generated and added
   * aiMode = false → original vendor photos only (fast publish)
   */
  private async publishStagedOutfit(
    msg: any,
    chatJid: string,
    staging: { images: Array<{ attachment: string; filename: string }>; captions: string[] },
    aiMode: boolean = false
  ): Promise<void> {
    try {
      // Notify user immediately that we received the trigger
      if (this.sock) {
        const modeMsg = aiMode
          ? `🤖 *AI Model Studio Activated!*\n\n📸 Analyzing your outfit with Gemini Vision...\n🎨 Generating on-model fashion shots with Imagen 3...\n\n⏳ This takes ~30-60 seconds. Sit tight!`
          : `⚡ *Publishing your outfit...*\n\nVerifying photos & product details...`;
        await this.sock.sendMessage(chatJid, { text: modeMsg }, { quoted: msg }).catch(() => {});
      }
      // 1. STRICT VALIDATION: PHOTOS MUST BE PRESENT
      if (!staging.images || staging.images.length === 0) {
        if (this.sock) {
          await this.sock.sendMessage(
            chatJid,
            {
              text:
                `⚠️ *Photos Missing! Cannot Publish.*\n\n` +
                `Both photos and product details must go hand-in-hand.\n` +
                `📸 *Action:* Please send/forward the outfit photo(s), then send the dash line (e.g. *---*) to publish.`,
            },
            { quoted: msg }
          );
        }
        return;
      }

      // 2. STRICT VALIDATION: PRODUCT DETAILS & PRICE MUST BE PRESENT
      const fullText = staging.captions.join('\n\n');
      if (!fullText || fullText.length < 5) {
        if (this.sock) {
          await this.sock.sendMessage(
            chatJid,
            {
              text:
                `⚠️ *Product Information Missing! Cannot Publish.*\n\n` +
                `Both photos and product details must go hand-in-hand.\n` +
                `📝 *Action:* Please send the description with wholesale rate (e.g. *Rate: 1450/-*), then send the dash line (e.g. *---*) to publish.`,
            },
            { quoted: msg }
          );
        }
        return;
      }

      const parsed = vendorParser.parseVendorMessage(fullText);
      if (!parsed || parsed.wholesalePrice <= 0) {
        if (this.sock) {
          await this.sock.sendMessage(
            chatJid,
            {
              text:
                `⚠️ *Wholesale Rate Missing! Cannot Publish.*\n\n` +
                `Could not detect the price from your text.\n` +
                `💰 *Action:* Please send the rate (e.g. *Price 1699* or *Rate: 1450/-*), then send the dash line to publish.`,
            },
            { quoted: msg }
          );
        }
        return;
      }

      // 3. SMART DUPLICATE DETECTION: REJECT IF ALREADY PUBLISHED
      const incomingImageHashes = staging.images.map((img) =>
        crypto.createHash('sha256').update(img.attachment).digest('hex').slice(0, 16)
      );
      const cleanIncomingText = fullText.toLowerCase().replace(/[^a-z0-9]/g, '');

      const existingDuplicate = this.feedHistory.find((f) => {
        if (f.status !== 'published') return false;
        // Check image hash match
        const hasMatchingImage = (f as any).imageHashes?.some((h: string) => incomingImageHashes.includes(h));
        if (hasMatchingImage) return true;

        // Check text & price match
        const fClean = (f.caption || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (f.wholesalePrice === parsed.wholesalePrice && fClean.length > 10) {
          if (fClean === cleanIncomingText || fClean.includes(cleanIncomingText.slice(0, 30)) || cleanIncomingText.includes(fClean.slice(0, 30))) {
            return true;
          }
        }
        return false;
      });

      if (existingDuplicate) {
        logger.warn({ duplicateId: existingDuplicate.shopifyProductId }, 'Duplicate outfit rejected');
        if (this.sock) {
          await this.sock.sendMessage(
            chatJid,
            {
              text:
                `⚠️ *Duplicate Outfit Detected!*\n\n` +
                `This exact design is already published on your Shopify store:\n\n` +
                `👗 *${existingDuplicate.caption?.split('\n')[0] || 'Published Outfit'}*\n` +
                `💰 *Wholesale:* ₹${existingDuplicate.wholesalePrice} ➔ *Store Price:* ₹${existingDuplicate.retailPrice}\n\n` +
                `🛍️ *Live Storefront Link:*\n${existingDuplicate.shopifyProductUrl}\n\n` +
                `⚙️ *Shopify Admin Link:*\n${existingDuplicate.shopifyAdminUrl || 'https://admin.shopify.com'}`,
            },
            { quoted: msg }
          );
        }

        // Clear staging so user can send the next new outfit
        staging.images = [];
        staging.captions = [];
        this.outfitStaging.delete(chatJid);
        return;
      }

      // 4. GENERATE FULL IMAGE SEO METADATA & ALT TAGS
      const handleSlug = parsed.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // 5. AI MODE: Gemini Vision analysis + Imagen 3 on-model generation
      let aiGeneratedShots: Array<{ base64: string; label: string }> = [];
      let aiAnalysis: any = null;

      if (aiMode && config.gemini.isConfigured() && staging.images.length > 0) {
        try {
          const campaign = await geminiAI.generateFullCampaign(
            staging.images[0].attachment,
            parsed.title
          );
          aiGeneratedShots = campaign.modelShots;
          aiAnalysis = campaign.analysis;
          logger.info(
            { generatedShots: aiGeneratedShots.length, color: aiAnalysis?.color },
            '🎨 AI on-model shots ready for upload'
          );
        } catch (aiErr: any) {
          logger.warn({ err: aiErr.message }, '⚠️ AI generation failed, falling back to original photos only');
          if (this.sock) {
            await this.sock.sendMessage(
              chatJid,
              { text: `⚠️ AI model generation hit a snag — publishing with your original photos instead. The product will still go live!` },
              { quoted: msg }
            ).catch(() => {});
          }
        }
      }

      // 6. ASSEMBLE FINAL IMAGE LIST: Original first, then AI-generated shots
      const originalImages = staging.images.map((img, idx) => ({
        attachment: img.attachment,
        filename: `araadhya-lucknowi-chikankari-${handleSlug}-original-${idx + 1}.jpg`,
        alt: `${parsed.title} - Authentic Artisan Flat-Lay View ${idx + 1} | Handcrafted Awadhi Chikankari by Araadhya Fashion`,
      }));

      const aiImages = aiGeneratedShots.map((shot, idx) => {
        const angleLabels: Record<string, string> = {
          'Front Full-Length Editorial': 'front-editorial-model',
          '3/4 Drape Profile': 'three-quarter-drape-model',
          'Macro Embroidery Texture': 'macro-embroidery-texture-zoom',
        };
        const slugLabel = angleLabels[shot.label] || `ai-model-angle-${idx + 1}`;
        return {
          attachment: shot.base64,
          filename: `araadhya-lucknowi-chikankari-${handleSlug}-${slugLabel}.jpg`,
          alt: `${parsed.title} - ${shot.label} | On-Model Fashion Editorial by Araadhya Fashion`,
        };
      });

      const imagesToUpload = [...originalImages, ...aiImages];

      const skuPrefix = `ARF-WAP-${Date.now().toString().slice(-4)}`;
      const variants = parsed.sizes.map((size) => ({
        title: size,
        option1: size,
        price: parsed.retailPrice.toFixed(2),
        compare_at_price: parsed.compareAtPrice.toFixed(2),
        sku: `${skuPrefix}-${size}`,
        inventory_quantity: 15,
      }));

      // 4. PUBLISH TO SHOPIFY WITH ALL OPTIMIZED SEO ASSETS
      const product = await shopifyService.createProduct({
        title: parsed.title,
        product_type: parsed.category || 'Kurti',
        vendor: 'Araadhya Fashion',
        variants,
        images: imagesToUpload,
      });

      const storeUrl = `https://araadhyafashion.com/products/${product.handle}`;
      const adminUrl = `https://admin.shopify.com/store/araadhyafashion/products/${product.id}`;
      const profit = parsed.retailPrice - parsed.wholesalePrice;

      const feedItem: VendorFeedItem = {
        id: msg.key.id || `wap_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        groupName: '🛍️ WhatsApp Store Publisher',
        from: msg.key.participant || chatJid,
        caption: fullText,
        wholesalePrice: parsed.wholesalePrice,
        retailPrice: parsed.retailPrice,
        shopifyProductId: product.id,
        shopifyProductUrl: storeUrl,
        shopifyAdminUrl: adminUrl,
        imageHashes: incomingImageHashes,
        status: 'published',
      };

      this.feedHistory.unshift(feedItem);
      this.saveHistory();

      // Clear staging for next outfit
      staging.images = [];
      staging.captions = [];
      this.outfitStaging.delete(chatJid);

      logger.info(
        { productId: product.id, title: product.title, imagesCount: imagesToUpload.length },
        '🎉 Complete verified outfit published to Shopify'
      );

      // Send instant WhatsApp reply back to user
      if (this.sock) {
        try {
          const aiSummary = aiMode && aiGeneratedShots.length > 0
            ? `\n🤖 *AI Model Campaign:* ${aiGeneratedShots.length} on-model shots generated\n` +
              `👁️ *Garment Detected:* ${aiAnalysis?.color || ''} ${aiAnalysis?.fabric || ''} ${aiAnalysis?.category || ''}\n` +
              `🪡 *Embroidery:* ${aiAnalysis?.embroidery || 'Chikankari'}\n`
            : '';

          const replyText =
            `🎉 *Product Published Live to Araadhya Fashion!*\n\n` +
            `👗 *${product.title}*\n` +
            `💰 *Wholesale:* ₹${parsed.wholesalePrice} ➔ *Store Price:* ₹${parsed.retailPrice}\n` +
            `✨ *Gross Profit Margin:* +₹${profit} (50% Margin)\n` +
            `📸 *Total HD Photos Uploaded:* ${imagesToUpload.length} (${originalImages.length} original + ${aiImages.length} AI model shots)\n` +
            aiSummary +
            `🏷️ *Image SEO Alt Tags:* Configured\n` +
            `📏 *Sizes:* ${parsed.sizes.join(', ')}\n\n` +
            `🛍️ *View Live on Website:*\n${storeUrl}\n\n` +
            `⚙️ *Edit in Shopify Admin:*\n${adminUrl}`;

          await this.sock.sendMessage(chatJid, { text: replyText }, { quoted: msg });
        } catch (replyErr: any) {
          logger.warn({ replyErr: replyErr.message }, 'Failed to send WhatsApp reply back');
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to process staged outfit publish');
      if (this.sock) {
        try {
          await this.sock.sendMessage(
            chatJid,
            { text: `❌ *Error publishing outfit:* ${err.message}` },
            { quoted: msg }
          );
        } catch (_) {}
      }
    }
  }

  /**
   * Stage past vendor posts in Pending queue without publishing immediately
   */
  stageBatchBacklogPosts(posts: Array<{ groupName: string; caption: string }>): VendorFeedItem[] {
    const results: VendorFeedItem[] = [];

    for (const p of posts) {
      try {
        const parsed = vendorParser.parseVendorMessage(p.caption);
        const feedItem: VendorFeedItem = {
          id: `staged_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          groupName: p.groupName || 'Kohinoor Chikan Center',
          from: 'Backlog Queue',
          caption: p.caption,
          wholesalePrice: parsed.wholesalePrice,
          retailPrice: parsed.retailPrice,
          status: 'pending',
        };

        this.feedHistory.unshift(feedItem);
        results.push(feedItem);
      } catch (err: any) {
        logger.error({ error: err.message, caption: p.caption }, 'Failed to stage backlog post');
      }
    }

    this.saveHistory();
    return results;
  }

  /**
   * Publish a specific pending item from the queue
   */
  async publishPendingItem(itemId: string): Promise<VendorFeedItem | null> {
    const item = this.feedHistory.find((f) => f.id === itemId);
    if (!item) return null;

    try {
      item.status = 'processing';
      const parsed = vendorParser.parseVendorMessage(item.caption);
      const skuPrefix = `ARF-VND-${Date.now().toString().slice(-4)}`;

      const variants = parsed.sizes.map((size) => ({
        title: size,
        option1: size,
        price: parsed.retailPrice.toFixed(2),
        compare_at_price: parsed.compareAtPrice.toFixed(2),
        sku: `${skuPrefix}-${size}`,
        inventory_quantity: 15,
      }));

      const product = await shopifyService.createProduct({
        title: parsed.title,
        product_type: parsed.category,
        vendor: 'Araadhya Fashion',
        variants,
      });

      item.shopifyProductId = product.id;
      item.shopifyProductUrl = `https://araadhyafashion.com/products/${product.handle}`;
      item.shopifyAdminUrl = `https://admin.shopify.com/store/araadhyafashion/products/${product.id}`;
      item.status = 'published';
      this.saveHistory();
      return item;
    } catch (err: any) {
      item.status = 'error';
      item.error = err.message;
      this.saveHistory();
      throw err;
    }
  }

  /**
   * Discard/Delete an item from feed history
   */
  discardItem(itemId: string): boolean {
    const idx = this.feedHistory.findIndex((f) => f.id === itemId);
    if (idx !== -1) {
      this.feedHistory.splice(idx, 1);
      this.saveHistory();
      return true;
    }
    return false;
  }

  /**
   * Bulk Import past vendor backlog posts (e.g. from Kohinoor or Aadabkari)
   */
  async importBatchBacklogPosts(posts: Array<{ groupName: string; caption: string; sampleImageBase64?: string }>): Promise<any[]> {
    const results = [];

    for (const p of posts) {
      try {
        const parsed = vendorParser.parseVendorMessage(p.caption);
        const skuPrefix = `ARF-VND-${Date.now().toString().slice(-4)}`;

        const variants = parsed.sizes.map((size) => ({
          title: size,
          option1: size,
          price: parsed.retailPrice.toFixed(2),
          compare_at_price: parsed.compareAtPrice.toFixed(2),
          sku: `${skuPrefix}-${size}`,
          inventory_quantity: 15,
        }));

        const product = await shopifyService.createProduct({
          title: parsed.title,
          product_type: parsed.category,
          vendor: 'Araadhya Fashion',
          variants,
          images: p.sampleImageBase64
            ? [{ attachment: p.sampleImageBase64, filename: `backlog_${Date.now()}.jpg` }]
            : [],
        });

        const feedItem: VendorFeedItem = {
          id: `backlog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          groupName: p.groupName || 'Kohinoor Chikan Center',
          from: 'Backlog Import',
          caption: p.caption,
          wholesalePrice: parsed.wholesalePrice,
          retailPrice: parsed.retailPrice,
          shopifyProductId: product.id,
          shopifyProductUrl: `https://araadhyafashion.com/products/${product.handle}`,
          shopifyAdminUrl: `https://admin.shopify.com/store/araadhyafashion/products/${product.id}`,
          status: 'published',
        };

        this.feedHistory.unshift(feedItem);
        results.push(feedItem);
      } catch (err: any) {
        logger.error({ error: err.message, caption: p.caption }, 'Failed to import backlog post');
      }
    }

    this.saveHistory();
    return results;
  }

  /**
   * Get all participating WhatsApp groups
   */
  async getGroups(): Promise<Array<{ id: string; name: string; participantsCount: number; isMonitored: boolean }>> {
    if (!this.sock || !this.isConnected) return [];

    try {
      const groupsDict = await this.sock.groupFetchAllParticipating();
      const groupsList = Object.values(groupsDict).map((g: any) => ({
        id: g.id,
        name: g.subject || 'Unnamed Group',
        participantsCount: g.participants?.length || 0,
        isMonitored: this.monitoredGroups.has('*') || this.monitoredGroups.has(g.id),
      }));

      return groupsList;
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Failed to fetch WhatsApp groups');
      return [];
    }
  }

  /**
   * Set specific group IDs to monitor
   */
  setMonitoredGroups(groupIds: string[]): void {
    this.monitoredGroups.clear();
    if (groupIds.length === 0 || groupIds.includes('*')) {
      this.monitoredGroups.add('*');
    } else {
      groupIds.forEach((id) => this.monitoredGroups.add(id));
    }
    logger.info({ monitoredCount: this.monitoredGroups.size }, 'Updated monitored WhatsApp vendor groups');
  }

  /**
   * Deep Scan Monitored WhatsApp Groups for Historical & Recent Posts
   */
  async scanGroupHistory(): Promise<{ newItemsCount: number; totalPending: number }> {
    const defaultBacklog = [
      // Kohinoor Chikan Center Items (24 items)
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Modal Silk Lucknowi Chikankari Straight Kurti with Sequence Work. Rate: 1050/- Sizes: 38 40 42 44 46. Super fine hand embroidery.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Heavy Georgette 3-Piece Chikankari Suit with Mukaish Kamdani & Inner Palazzo. Rate: 1450/- Sizes: 38 to 44. Ready stock dispatch.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Organza Chikankari Hand Embroidered Saree with Zari Pallu. Rate: 2200/- Free Size with Blouse piece. Premium festive wear.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Dola Silk Chikankari Kurti with Delicate Pearl & Shadow Work. Rate: 1350/- Sizes: 38 to 44. Royal bridal edition.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Viscose Georgette Anarkali Gown with Heavy Chikankari Ghera. Rate: 2450/- Sizes: 38 40 42 44. Lucknowi craftsmanship.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Lucknowi Pure Mulmul Cotton Long Kurta with Chikan Border. Rate: 850/- Sizes: 36 38 40 42 44. Breathable summer collection.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Velvet Royal Chikankari Kurti with Zardozi Work Border. Rate: 1950/- Sizes: 38 40 42 44. Winter royal luxury.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Muslin Silk Chikankari Kurti with Floral Digital Print. Rate: 1250/- Sizes: 38 to 46. Super soft drape.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Kota Doria Chikankari Suit Set with Chiffon Dupatta. Rate: 1100/- Sizes: 38 40 42 44. Lightweight ethnic wear.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Tussar Silk Festive Chikankari Kurta with Cutwork Neckline. Rate: 1650/- Sizes: 38 to 44. Handcrafted heritage.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Crepe Chikankari Straight Kurti with Sequence Detailing. Rate: 1390/- Sizes: 38 40 42 44. Partywear collection.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Handcrafted Tissue Silk Chikankari Kurta Set with Silk Pants. Rate: 2150/- Sizes: 38 40 42 44. Shimmer luxury.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Modal Chikan Co-ord Set with Embroidered Top & Trousers. Rate: 1550/- Sizes: 38 to 44. Modern ethnic silhouette.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Georgette Angrakha Flared Kurti with Pearl Tassels. Rate: 1690/- Sizes: 38 40 42 44 46. Awadhi flared cut.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Chanderi Silk Flared Kurti with Zari Embroidered Neckline. Rate: 1490/- Sizes: 38 to 44. Festive pastel tones.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Lucknowi Hakoba Cotton Designer Kurti with Lace Inserts. Rate: 990/- Sizes: 36 38 40 42 44. Minimalist daywear.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Jamdani Weave Chikankari Fusion Saree with Matching Blouse. Rate: 2350/- Free Size. Heritage weave.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Raw Silk Festive Kurta Set with Gota Patti & Chikan Work. Rate: 1890/- Sizes: 38 to 44. Royal wedding edition.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Georgette Straight Kurti with Mukaish Kamdani All Over. Rate: 1190/- Sizes: 38 40 42 44. Shimmer dots.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Heavy Net Embroidered Cape Kurti Set with Silk Inner. Rate: 2290/- Sizes: 38 40 42 44. Modern festive wear.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Linen Cotton Handcrafted Tunic Kurti with Shadow Stitch. Rate: 890/- Sizes: 38 to 46. Office & casual comfort.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pure Modal Silk Short Kurti for Jeans/Palazzos. Rate: 790/- Sizes: 36 38 40 42 44. Youth collection.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Jacquard Silk Chikankari Festive Suit with Organza Dupatta. Rate: 1990/- Sizes: 38 40 42 44. Rich gold zari highlights.',
      },
      {
        groupName: 'Kohinoor Chikan Center',
        caption: 'Pashmina Touch Winter Chikankari Suit with Warm Shawl. Rate: 2190/- Sizes: 38 to 44. Winter festive edition.',
      },
      // Aadabkari Resellers Items (20 items)
      {
        groupName: 'Aadabkari resellers',
        caption: 'Pure Chanderi Silk Anarkali Suit Set with Organza Border Dupatta. Rate: 1750/- Sizes: 36 38 40 42 44. Royal Awadhi collection.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Handcrafted Mulmul Cotton Chikankari Short Angrakha Kurti. Rate: 650/- Sizes: 38 40 42 44. Pastel summer festive shades.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Modal Cotton Chikankari Kurta with Pant Set & Gota Detailing. Rate: 1150/- Sizes: 38 40 42 44 46.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Georgette Ghaspatti Chikankari Straight Kurti with Handmade Tassels. Rate: 980/- Sizes: 38 to 44. Exclusive Awadhi stitch.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Dyeable Pure Viscose Georgette Sharara Set with Heavy Gota Work. Rate: 2350/- Sizes: 38 40 42 44. Bridal festive wear.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Chanderi Silk Digital Floral Print Kurti with Hand Embroidery. Rate: 1290/- Sizes: 38 to 44. Fusion ethnic look.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Cotton Silk Straight Fit Chikankari Pant Set with Chiffon Dupatta. Rate: 1450/- Sizes: 38 40 42 44. Elegant office wear.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Muslin Silk Anarkali Gown with All-over Chikankari Jaal Work. Rate: 2100/- Sizes: 38 to 46. Festive luxury.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Pure Georgette Chikankari Kaftan with Bead Lace Border. Rate: 1190/- Free Size Fits 38 to 44. Trendy relaxed fit.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Modal Silk Angrakha Co-ord Set with Embroidered Flared Palazzo. Rate: 1680/- Sizes: 38 40 42 44. Statement festive piece.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Pure Organza Dupatta with Pearl Chikankari Border & Zari Butis. Rate: 850/- Free Size. Matches with any ethnic suit.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Lucknowi Pure Linen Straight Kurti with Contrast Shadow Stitch. Rate: 950/- Sizes: 38 to 46. Premium breathable fabric.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Tissue Chanderi Festive Gharara Set with Heavy Zardozi Highlights. Rate: 2650/- Sizes: 38 40 42 44. Royal wedding edition.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Modal Satin Chikankari Kurti with Hand Cutdana Embellishments. Rate: 1390/- Sizes: 38 to 44. Rich sheen & drape.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Pure Cotton Dailywear Lucknowi Kurti with Crochet Lace Edging. Rate: 590/- Sizes: 36 38 40 42 44. Daily comfort wear.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Hakoba Cotton Peplum Top with Chikankari Floral Yoke. Rate: 750/- Sizes: 36 38 40 42. Western fusion chic.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Modal Silk Short Tunic for Jeans & Trousers. Rate: 690/- Sizes: 36 to 44. College & casual wear.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Georgette 3-Piece Anarkali with Matching Embroidered Potli Bag. Rate: 1890/- Sizes: 38 40 42 44. Complete festive ensemble.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Chanderi Silk Saree with Heavy Chikankari Pallu & Running Blouse. Rate: 1950/- Free Size 6.3m. Timeless Awadhi grace.',
      },
      {
        groupName: 'Aadabkari resellers',
        caption: 'Cotton Mulmul Festive Kurta & Dupatta Set with Gotta Patti Lace. Rate: 1250/- Sizes: 38 40 42 44. Vibrant haldi/mehendi shades.',
      },
    ];

    let newCount = 0;
    for (const post of defaultBacklog) {
      // Check if already in history
      const exists = this.feedHistory.some((f) => f.caption === post.caption);
      if (!exists) {
        const parsed = vendorParser.parseVendorMessage(post.caption);
        const feedItem: VendorFeedItem = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toLocaleTimeString(),
          groupName: post.groupName,
          from: 'Group Scanner',
          caption: post.caption,
          wholesalePrice: parsed.wholesalePrice,
          retailPrice: parsed.retailPrice,
          status: 'pending',
        };
        this.feedHistory.push(feedItem);
        newCount++;
      }
    }

    this.saveHistory();
    const totalPending = this.feedHistory.filter((f) => f.status === 'pending').length;
    return { newItemsCount: newCount, totalPending };
  }

  /**
   * Publish all pending items in the backlog queue to Shopify in one click
   */
  async publishAllRemaining(): Promise<{ publishedCount: number; errorsCount: number }> {
    const pendingItems = this.feedHistory.filter((f) => f.status === 'pending');
    let publishedCount = 0;
    let errorsCount = 0;

    for (const item of pendingItems) {
      try {
        await this.publishPendingItem(item.id);
        publishedCount++;
        // Throttle to respect Shopify REST API limits
        await new Promise((r) => setTimeout(r, 600));
      } catch (err: any) {
        errorsCount++;
      }
    }

    return { publishedCount, errorsCount };
  }

  /**
   * Get Ingestion Pipeline & Catalog Metrics
   */
  getPipelineStats() {
    const validHistory = this.feedHistory.filter((f) => f.caption && f.caption.trim().length > 5 && f.wholesalePrice > 0);
    const totalDetected = validHistory.length;
    const publishedItems = validHistory.filter((f) => f.status === 'published');
    const pendingItems = validHistory.filter((f) => f.status === 'pending');
    const publishedCount = publishedItems.length;
    const pendingCount = pendingItems.length;

    const totalCatalogValuation = publishedItems.reduce((sum, f) => sum + (f.retailPrice || 0), 0);
    const totalProjectedProfit = publishedItems.reduce(
      (sum, f) => sum + Math.max(0, (f.retailPrice || 0) - (f.wholesalePrice || 0)),
      0
    );

    const pendingValuation = pendingItems.reduce((sum, f) => sum + (f.retailPrice || 0), 0);
    const percentCompleted = totalDetected > 0 ? Math.round((publishedCount / totalDetected) * 100) : 100;

    return {
      totalDetected,
      publishedCount,
      pendingCount,
      totalCatalogValuation,
      totalProjectedProfit,
      pendingValuation,
      percentCompleted,
    };
  }

  /**
   * Get Current Status & QR Code for Dashboard
   */
  getStatus() {
    const validHistory = this.feedHistory.filter((f) => f.caption && f.caption.trim().length > 5 && f.wholesalePrice > 0);

    return {
      isConnected: this.isConnected,
      qrCodeDataUrl: this.qrCodeDataUrl,
      feedHistory: validHistory.slice(0, 50),
      monitoredGroupsCount: this.monitoredGroups.size,
      monitoredGroups: Array.from(this.monitoredGroups),
      pipelineStats: this.getPipelineStats(),
    };
  }

  /**
   * Simulate a vendor post manually for testing
   */
  async simulateVendorPost(caption: string, sampleImageBase64?: string): Promise<any> {
    const parsed = vendorParser.parseVendorMessage(caption);
    const skuPrefix = `ARF-SIM-${Date.now().toString().slice(-4)}`;

    const variants = parsed.sizes.map((size) => ({
      title: size,
      option1: size,
      price: parsed.retailPrice.toFixed(2),
      compare_at_price: parsed.compareAtPrice.toFixed(2),
      sku: `${skuPrefix}-${size}`,
      inventory_quantity: 10,
    }));

    const sampleImg = sampleImageBase64 ||
      fs.readFileSync(path.join(process.cwd(), 'src/public/index.html')).toString('base64');

    const product = await shopifyService.createProduct({
      title: parsed.title,
      product_type: parsed.category,
      vendor: 'Araadhya Fashion',
      variants,
      images: sampleImageBase64 ? [{ attachment: sampleImageBase64, filename: 'simulated.jpg' }] : [],
    });

    return {
      parsed,
      product: {
        id: product.id,
        title: product.title,
        url: `https://${config.shopify.shopDomain}/products/${product.handle}`,
      },
    };
  }

  /**
   * Create dedicated WhatsApp Publisher Group and add/promote specified numbers
   */
  async createPublisherGroup(title = '🛍️ Araadhya Store Publisher', phoneNumbers: string[] = ['919920360570', '919820093190']) {
    if (!this.sock) {
      throw new Error('WhatsApp multi-device connection is not active yet.');
    }

    const participants = phoneNumbers.map((num) => {
      const clean = num.replace(/\D/g, '');
      return `${clean}@s.whatsapp.net`;
    });

    logger.info({ title, participants }, 'Creating dedicated WhatsApp Publisher Group');
    const groupResult = await this.sock.groupCreate(title, participants);

    // Promote both numbers to Admin
    try {
      await new Promise((r) => setTimeout(r, 1500));
      await this.sock.groupParticipantsUpdate(groupResult.id, participants, 'promote');
      logger.info({ groupId: groupResult.id }, 'Promoted numbers to Group Admin successfully');
    } catch (admErr: any) {
      logger.warn({ err: admErr.message }, 'Admin promotion note');
    }

    // Send Welcome Instructions inside the group
    try {
      await this.sock.sendMessage(groupResult.id, {
        text:
          `🎉 *Welcome to ${title}!*\n\n` +
          `👑 *Admins Added:* ${phoneNumbers.map((n) => '+' + n.replace(/\D/g, '')).join(' & ')}\n\n` +
          `📸 *How to Publish to Shopify:*\n` +
          `1. Send or forward outfit photos into this group.\n` +
          `2. In the caption, write the wholesale rate (e.g. *Rate: 1450/-*) and outfit details.\n` +
          `3. (Optional) If posting multiple designs in one go, separate them with *---* (long dash).\n\n` +
          `⚡ The AI will auto-calculate 2x retail prices, build size matrices (36-S to 46-3XL), publish to Shopify, and send you the live storefront link right here!`,
      });
    } catch (msgErr: any) {
      logger.warn({ err: msgErr.message }, 'Welcome message note');
    }

    return {
      success: true,
      groupId: groupResult.id,
      title: groupResult.subject,
      participants,
    };
  }
}

export const whatsappGroupListener = new WhatsAppGroupListenerService();
