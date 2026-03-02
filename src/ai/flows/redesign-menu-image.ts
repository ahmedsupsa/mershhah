'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RedesignMenuImageInputSchema = z.object({
  imageDataUri: z.string().describe("The original product image as a data URI."),
  itemName: z.string().describe("The name of the food item."),
  instruction: z.string().optional().describe("Optional specific instructions for the redesign."),
});

export type RedesignMenuImageInput = z.infer<typeof RedesignMenuImageInputSchema>;

const RedesignMenuImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The redesigned image as a data URI."),
});

export type RedesignMenuImageOutput = z.infer<typeof RedesignMenuImageOutputSchema>;

export async function redesignMenuImage(input: RedesignMenuImageInput): Promise<RedesignMenuImageOutput> {

    const promptText = `
    You are a professional food photographer and creative director.
    Your task is to take a user's **product** and place it within the **style and setting** of a reference image they provide.

    **The Goal:** Create a new, photorealistic image of the user's specified product, but make it look like it belongs in the scene from the reference image.

    **User's Product (The new subject):** "${input.itemName}"
    **Reference Image (For style, lighting, and composition):** You will be provided with an image. This image contains the *style* to be copied, but the food item in it should be **replaced**.
    **User's Instruction:** ${input.instruction || 'Recreate the scene with my product.'}

    **CRITICAL INSTRUCTIONS:**
    1.  **Identify the Style:** Analyze the reference image for its lighting (e.g., bright, moody), composition (e.g., flat-lay, close-up), background (e.g., wooden table, blurred cafe), and overall mood.
    2.  **Replace the Subject:** DO NOT simply copy or enhance the food in the reference image. Your main task is to **replace** it with a photorealistic version of the user's product: **"${input.itemName}"**.
    3.  **Combine Style and New Subject:** Generate a new image that seamlessly blends the style of the reference image with the new product. The final image should look like a professional photoshoot of the user's product in that specific environment.
    4.  **High Quality:** The final image must be high-quality, delicious-looking, and commercially appealing.

    The final output MUST be only the image. Do not include any text or logos.
    `;

    const { media } = await ai.generate({
        model: 'googleai/gemini-3.1-pro-preview',
        prompt: [
            { media: { url: input.imageDataUri } },
            { text: promptText }
        ],
        config: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    });

    if (!media?.url) {
        throw new Error('Image redesign failed or returned no media.');
    }

    return { imageDataUri: media.url };
}
