import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { logger } from '../utils/logger';
import axios from 'axios';

class GeminiAIService {
  private genAI: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!config.gemini.isConfigured()) {
        throw new Error('Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.');
      }
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    }
    return this.genAI;
  }

  /**
   * Step 1: Use Gemini Vision to precisely analyze the outfit photo
   * and extract a detailed garment description for model generation
   */
  async analyzeOutfitPhoto(base64Image: string): Promise<{
    garmentDescription: string;
    fabric: string;
    color: string;
    embroidery: string;
    neckline: string;
    category: string;
    embellishments: string;
  }> {
    const client = this.getClient();
    // Use gemini-3.6-flash which is confirmed working on free tier
    const model = client.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `You are an expert Indian ethnic fashion analyst. Look at this Lucknowi Chikankari outfit photo carefully.

Analyze and describe EXACTLY:
1. The PRIMARY COLOR of the fabric (be very specific e.g. "sage mint green", "dusty blush rose")  
2. The FABRIC TYPE (modal silk, georgette, mulmul cotton, etc.)
3. The SILHOUETTE — Is it a kurta, anarkali, palazzo set, kurti-pant?
4. The NECKLINE style (round neck, V-neck, boat neck, sweetheart, etc.)
5. The SLEEVE style and length (3/4, full, half, sleeveless)
6. The BOTTOM (palazzo, pant, churidar, lehenga skirt, etc.)
7. The EMBROIDERY pattern details — describe the Chikankari stitches visible (Bakhiya, Phanda, Tepchi, Keel Kangan, Shadow work, Mukaish)
8. DUPATTA style (present or absent, sheer or solid)
9. Any EMBELLISHMENTS (lace borders, gota patti, thread sequins, mirror work)

Return ONLY valid JSON in this exact format:
{
  "garmentDescription": "A flowing [COLOR] [FABRIC] Lucknowi Chikankari [SILHOUETTE] featuring [EMBROIDERY DETAILS] with [NECKLINE] neckline and [SLEEVE] sleeves paired with matching [BOTTOM]",
  "fabric": "[FABRIC TYPE]",
  "color": "[PRIMARY COLOR]",
  "embroidery": "[EMBROIDERY TYPE/STITCHES]",
  "neckline": "[NECKLINE STYLE]",
  "category": "[KURTA SET / ANARKALI / KURTI / PALAZZO SET]",
  "embellishments": "[EMBELLISHMENTS OR 'none']"
}`;

    try {
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg' as const,
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text().trim();

      // Extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse garment analysis JSON');

      const analysis = JSON.parse(jsonMatch[0]);
      logger.info({ color: analysis.color, fabric: analysis.fabric, category: analysis.category }, '🔍 Gemini Vision garment analysis complete');
      return analysis;
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Gemini Vision analysis failed, using fallback description');
      return {
        garmentDescription: 'A flowing pastel Lucknowi Chikankari kurta palazzo set with intricate hand-embroidered Bakhiya stitchwork',
        fabric: 'Modal Silk',
        color: 'Pastel',
        embroidery: 'Bakhiya & Phanda Chikankari',
        neckline: 'Round neck',
        category: 'Palazzo Set',
        embellishments: 'none',
      };
    }
  }

  /**
   * Step 2: Generate on-model fashion shots using Imagen 3
   * via Google AI Studio REST API
   */
  async generateModelShots(
    garmentAnalysis: Awaited<ReturnType<GeminiAIService['analyzeOutfitPhoto']>>,
    productTitle: string
  ): Promise<Array<{ base64: string; label: string }>> {
    if (!config.gemini.isConfigured()) {
      throw new Error('Gemini API not configured');
    }

    const shots = [
      {
        label: 'Front Full-Length Editorial',
        prompt: this.buildModelPrompt(garmentAnalysis, 'front_full'),
      },
      {
        label: '3/4 Drape Profile',
        prompt: this.buildModelPrompt(garmentAnalysis, 'three_quarter'),
      },
      {
        label: 'Macro Embroidery Texture',
        prompt: this.buildTexturePrompt(garmentAnalysis),
      },
    ];

    const results: Array<{ base64: string; label: string }> = [];

    for (const shot of shots) {
      try {
        logger.info({ label: shot.label }, '🎨 Generating AI model shot with Imagen 3...');
        const imageBase64 = await this.callImagen3(shot.prompt);
        if (imageBase64) {
          results.push({ base64: imageBase64, label: shot.label });
          logger.info({ label: shot.label }, '✅ AI model shot generated successfully');
        }
        // Small delay between API calls to respect rate limits
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err: any) {
        logger.warn({ label: shot.label, err: err.message }, '⚠️ Could not generate this model shot, skipping');
      }
    }

    return results;
  }

  /**
   * Build hyper-realistic on-model fashion prompt for front full-length shot
   */
  private buildModelPrompt(
    analysis: Awaited<ReturnType<GeminiAIService['analyzeOutfitPhoto']>>,
    angle: 'front_full' | 'three_quarter'
  ): string {
    const isFront = angle === 'front_full';

    return `A hyper-realistic editorial fashion photograph of a beautiful young Indian woman wearing ${analysis.garmentDescription}.

The model is wearing this exact outfit:
- Fabric: ${analysis.fabric} in ${analysis.color} color
- Embroidery: ${analysis.embroidery} hand-stitched details on the garment
- Neckline: ${analysis.neckline}
- Embellishments: ${analysis.embellishments}

GARMENT ACCURACY: The garment must look EXACTLY as described — same color, same embroidery pattern, same neckline, same silhouette. Do NOT change any design element.

${isFront
  ? 'POSE: Front-facing, elegant upright stance, full-length shot showing the entire outfit from head to toe. Arms slightly relaxed at sides.'
  : 'POSE: 3/4 angle stance, slight turn to show the drape of the dupatta and palazzo flare. Natural graceful movement.'}

MODEL: Tall, elegant, warm wheatish Indian complexion. Natural makeup — dewy skin, soft kohl eyes, nude-rose lips. Hair — loose soft waves or neatly pinned low bun with jasmine flowers.

JEWELLERY: Oxidized silver jhumkas, delicate silver necklace, glass bangles. No heavy jewellery.

SETTING: ${isFront
  ? 'Warm luxury minimal studio — pure ivory/cream backdrop, soft directional golden-hour window light casting gentle shadows. Clean professional fashion editorial.'
  : 'Elegant heritage courtyard — sandstone arch background, warm diffused daylight, natural green foliage accent in corner.'}

PHOTOGRAPHY STYLE: Shot on Hasselblad medium format camera, 85mm portrait lens, f/2.8, soft bokeh background. High-end Indian fashion magazine editorial quality — think Vogue India, Harper\'s Bazaar India.

IMPORTANT: Ultra-realistic human skin texture, real fabric drape, natural creases in the garment. NOT digital art, NOT illustration. Must look like a real photograph taken in a professional studio.`;
  }

  /**
   * Build macro embroidery texture close-up prompt
   */
  private buildTexturePrompt(analysis: Awaited<ReturnType<GeminiAIService['analyzeOutfitPhoto']>>): string {
    return `An extremely detailed macro photography close-up of authentic hand-embroidered Lucknowi Chikankari needlework on ${analysis.color} ${analysis.fabric} fabric.

The fabric shows beautiful ${analysis.embroidery} stitches — delicate white thread hand-stitched patterns on the ${analysis.color} base fabric. The stitches are intricate, precise, and handcrafted with real artisan skill.

PHOTOGRAPHY STYLE: Shot on Canon EOS R5 with 100mm macro lens, f/4.5, ring flash. The fabric fills 100% of the frame. You can see the individual threads, the weave of the fabric, and the exquisite hand-needlework detail up close. Soft shadow details show the 3D texture of the raised embroidery.

Professional product photography for luxury ethnic wear brand. Ultra-sharp focus on the embroidery details. NOT a flat illustration — must look like a real fabric photograph.`;
  }

  /**
   * Call Gemini native image generation model (gemini-3.1-flash-image or gemini-3-pro-image)
   */
  private async callImagen3(prompt: string): Promise<string | null> {
    const apiKey = config.gemini.apiKey;
    // Use gemini-3.1-flash-image — the native image gen model confirmed in this account
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    };

    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 90000,
    });

    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data; // base64 image
      }
    }

    return null;
  }

  /**
   * Full pipeline: Analyze outfit + Generate 3 model shots
   * Returns all AI-generated images as base64 strings with labels
   */
  async generateFullCampaign(
    originalBase64: string,
    productTitle: string
  ): Promise<{
    analysis: Awaited<ReturnType<GeminiAIService['analyzeOutfitPhoto']>>;
    modelShots: Array<{ base64: string; label: string }>;
  }> {
    logger.info({ productTitle }, '🤖 Starting Gemini AI full campaign generation...');

    const analysis = await this.analyzeOutfitPhoto(originalBase64);
    const modelShots = await this.generateModelShots(analysis, productTitle);

    logger.info(
      { generatedCount: modelShots.length, productTitle },
      '🎉 AI campaign generation complete!'
    );

    return { analysis, modelShots };
  }
}

export const geminiAI = new GeminiAIService();
