'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateMenuImageInputSchema = z.object({
  itemName: z.string().describe("The name of the food item."),
  itemDescription: z.string().optional().describe("A short description of the food item."),
  style: z.enum(['clean_white_background', 'realistic_restaurant_setting', 'dramatic_charcoal_sketch', 'vibrant_watercolor_art']),
  customInstructions: z.string().optional().describe("Additional specific instructions from the user."),
  restaurantLogoUrl: z.string().url().optional().describe("Public URL of the restaurant's logo."),
});

export type GenerateMenuImageInput = z.infer<typeof GenerateMenuImageInputSchema>;

const GenerateMenuImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI."),
});

export type GenerateMenuImageOutput = z.infer<typeof GenerateMenuImageOutputSchema>;

export async function generateMenuImage(input: GenerateMenuImageInput): Promise<GenerateMenuImageOutput> {
    
    const basePrompt = `High-quality, professional image of a food item.
    Subject: "${input.itemName}" - ${input.itemDescription || 'No description provided.'}
    `;

    let stylePrompt = '';
    switch (input.style) {
        case 'clean_white_background':
            stylePrompt = `Style: Clean, bright, commercial product photography. The food must look fresh and delicious, centered, and well-lit. Background: solid, pure white background (#FFFFFF). The image must NOT contain any other objects, props, text, or elements. ONLY the food on a white background.`;
            break;
        case 'realistic_restaurant_setting':
            stylePrompt = `Style: Photorealistic, as if taken in a high-end restaurant. The food should be beautifully plated on a ceramic dish, placed on a dark wooden table. The background should be a softly blurred, warm, and cozy restaurant interior with ambient lighting.`;
            break;
        case 'dramatic_charcoal_sketch':
             stylePrompt = `Style: A dramatic, high-contrast charcoal sketch of the food item. The style should be artistic and bold, with heavy, textured strokes. Focus on the form and texture of the food. Black and white only.`;
            break;
        case 'vibrant_watercolor_art':
            stylePrompt = `Style: A vibrant and expressive watercolor painting of the food item. Use loose, wet-on-wet techniques with bright, appetizing colors. The final image should feel artistic and fresh.`;
            break;
    }

    const customInstructionPrompt = input.customInstructions ? `\nCRITICAL: Follow these user instructions precisely: "${input.customInstructions}"` : '';

    const finalPrompt = `${basePrompt}\n${stylePrompt}\n${customInstructionPrompt}`;

    const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast-generate-001',
        prompt: finalPrompt,
    });

    if (!media?.url) {
        throw new Error('Image generation failed or returned no media.');
    }

    return { imageDataUri: media.url };
}
