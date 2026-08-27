export interface AngleShotPrompt {
  angleName: string;
  label: string;
  prompt: string;
  aspectRatio: '3:4' | '1:1' | '9:16';
}

export class AIStudioService {
  /**
   * Generates 5 hyper-realistic editorial studio angle prompts for Indian ethnic fashion
   */
  getMultiAnglePrompts(outfitDescription: string, color: string = 'pastel tone'): AngleShotPrompt[] {
    const baseRealism = `Editorial fashion photograph of an elegant Indian female model, 24 years old, natural warm skin tone, subtle elegant makeup, wearing an authentic handcrafted ${outfitDescription} in ${color}. Highly realistic fabric texture with tangible embroidery depth, delicate cotton and silk threads, natural realistic lighting, shot on 85mm lens at f/2.8, luxury heritage boutique studio background with soft warm ambient light, authentic fashion magazine quality, no artificial plastic skin, natural pores and fabric weave.`;

    return [
      {
        angleName: 'front_full_length',
        label: '1. Front Full-Length Studio Pose',
        aspectRatio: '3:4',
        prompt: `${baseRealism} Full-length frontal portrait pose, model standing gracefully with natural poise, showcasing the full outfit silhouette, elegant neckline, and beautiful drape down to the ankles. Soft studio lighting.`,
      },
      {
        angleName: 'three_quarter_profile',
        label: '2. 3/4 Side Profile Angle',
        aspectRatio: '3:4',
        prompt: `${baseRealism} Three-quarter 3/4 angle side view, model looking slightly away with a gentle smile, displaying the sleeve embroidery, side seam craftsmanship, and natural flow of the garment.`,
      },
      {
        angleName: 'macro_embroidery_detail',
        label: '3. Macro Embroidery & Fabric Texture Close-Up',
        aspectRatio: '1:1',
        prompt: `Macro close-up photograph of the authentic Lucknowi Chikankari embroidery on the ${outfitDescription}. Extreme realistic detail of the handcrafted Bakhiya and Phanda threadwork, delicate texture of the pure fabric, tactile depth, natural light highlighting the artisan craftsmanship. No model face visible, strictly focused on luxury fabric and embroidery.`,
      },
      {
        angleName: 'back_profile_drape',
        label: '4. Back Profile & Dupatta Drape',
        aspectRatio: '3:4',
        prompt: `${baseRealism} Rear back-angle pose, model turned looking over her shoulder, showcasing the back neck embroidery design, graceful fit, and matching dupatta draping across the shoulder.`,
      },
      {
        angleName: 'editorial_movement_lifestyle',
        label: '5. Editorial Candid Movement Pose',
        aspectRatio: '3:4',
        prompt: `${baseRealism} Editorial lifestyle candid shot, model mid-movement in a gentle graceful turn, capturing the flowy flare and motion of the garment in a sunlit regal Indian courtyard.`,
      },
    ];
  }
}

export const aiStudio = new AIStudioService();
