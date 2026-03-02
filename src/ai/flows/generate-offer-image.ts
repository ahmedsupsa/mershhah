'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateOfferImageInputSchema = z.object({
  offerTitle: z.string().describe("The title of the offer."),
  offerDescription: z.string().optional().describe("A short description of the offer."),
  style: z.enum(['modern_and_bold', 'elegant_and_minimalist', 'fun_and_festive']),
  includedItems: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
  })).optional().describe("An optional list of menu items included in the offer."),
});

export type GenerateOfferImageInput = z.infer<typeof GenerateOfferImageInputSchema>;

const GenerateOfferImageOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI."),
});

export type GenerateOfferImageOutput = z.infer<typeof GenerateOfferImageOutputSchema>;

export async function generateOfferImage(input: GenerateOfferImageInput): Promise<GenerateOfferImageOutput> {
    
    const includedItemsPrompt = input.includedItems && input.includedItems.length > 0 ? `
**This offer includes the following food items:**
${input.includedItems.map(item => `- **${item.name}**: ${item.description || ''}`).join('\n')}
The final image should feature these items.` : `The image should feature generic, appetizing food that represents the theme of the offer (e.g., a family meal, a special combo).`;

    let styleInstructions = '';
    switch (input.style) {
        case 'modern_and_bold':
            styleInstructions = `Typography should be a bold, modern, sans-serif Arabic font. Use a dynamic layout with strong colors and high contrast. The mood should be energetic and eye-catching.`;
            break;
        case 'elegant_and_minimalist':
            styleInstructions = `Typography should be a thin, elegant Arabic font. Use a clean, minimalist layout with a lot of white space. The color palette should be sophisticated and muted. The mood is premium and high-end.`;
            break;
        case 'fun_and_festive':
            styleInstructions = `Typography should be a playful, maybe even handwritten-style Arabic font. Use bright, celebratory colors, and feel free to add graphic elements like confetti or streamers. The mood is joyful and exciting.`;
            break;
    }


    const promptText = `You are a professional creative director and graphic designer specializing in food advertising for the Saudi market. Your task is to design a complete, eye-catching promotional advertisement for a restaurant offer, suitable for social media platforms like Instagram.

**Offer Details:**
- **Title (in Arabic):** "${input.offerTitle}"
- **Description (in Arabic):** "${input.offerDescription || 'No description provided.'}"

**Core Task:**
Create a single, beautiful image that combines professional food photography with integrated graphic design elements.

**Art Direction & Instructions:**

1.  **Image Content:**
    *   ${includedItemsPrompt}
    *   The food should look delicious, fresh, and professionally photographed with an appetizing style. Arrange the items artfully (e.g., a dynamic collage, a flat-lay scene, or a hero shot).

2.  **Text Integration:**
    *   **Crucially, you must embed the offer title and description directly into the image.**
    *   The text should be in **Arabic**.
    *   **Typography & Style:** ${styleInstructions}
    *   **Hierarchy:** The **Offer Title** should be prominent and eye-catching. The **Description** can be smaller but still legible.

3.  **Overall Mood & Style:**
    *   The design should be vibrant, modern, and highly appealing. It should make the viewer feel hungry and excited about the offer.
    *   The composition must be balanced, combining the food photography and the text elements harmoniously.
    *   Do NOT include any logos or prices. The focus is on the food and the offer text.

Your final output should be a single, complete advertisement image.`;

    const { media } = await ai.generate({
        model: 'googleai/imagen-3-fast-generate-001',
        prompt: promptText,
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return { imageDataUri: media.url };
}
