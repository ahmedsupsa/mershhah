'use server';

/**
 * @fileOverview A Genkit flow to extract menu items from an image using a multimodal model.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractedItemSchema = z.object({
  name: z.string().describe("The name of the dish or drink."),
  description: z.string().optional().describe("A brief description of the item, if available on the menu."),
  category: z.string().describe("The category the item belongs to (e.g., 'المقبلات', 'Main Courses', 'الحلويات')."),
  sizes: z.array(z.object({
    name: z.string().describe("The size of the item (e.g., 'صغير', 'Regular', 'Large'). If only one price, use 'عادي' or 'Standard'.").default('عادي'),
    price: z.coerce.number().describe("The price for that size."),
  })).describe("A list of sizes and their corresponding prices."),
  calories: z.coerce.number().optional().describe("The calorie count, if mentioned on the menu."),
});

const ExtractMenuInputSchema = z.object({
  menuImageDataUri: z.string().describe("A data URI of the menu image to be processed."),
});

export type ExtractMenuInput = z.infer<typeof ExtractMenuInputSchema>;

const ExtractMenuOutputSchema = z.object({
  extractedItems: z.array(ExtractedItemSchema).describe("An array of all menu items found in the image."),
  error: z.string().optional().describe("An error message if the operation failed."),
});

export type ExtractMenuOutput = z.infer<typeof ExtractMenuOutputSchema>;

export async function extractMenuFromImage(input: ExtractMenuInput): Promise<ExtractMenuOutput> {
  return extractMenuFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractMenuFromImagePrompt',
  input: { schema: ExtractMenuInputSchema },
  output: { schema: z.object({ extractedItems: z.array(ExtractedItemSchema) }) },
  prompt: `You are an expert AI assistant specializing in optical character recognition (OCR) and data extraction for restaurant menus. Your task is to analyze the provided menu image and extract all food and drink items into a structured JSON format.

  **Menu Image:**
  {{media url=menuImageDataUri}}
  `,
});

const extractMenuFlow = ai.defineFlow(
  {
    name: 'extractMenuFlow',
    inputSchema: ExtractMenuInputSchema,
    outputSchema: ExtractMenuOutputSchema,
  },
  async (input): Promise<ExtractMenuOutput> => {
    try {
        const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
        if (!output) {
            throw new Error("The AI model failed to return a valid response.");
        }
        return { extractedItems: output.extractedItems };
    } catch (error: any) {
        console.error("Error in extractMenuFlow:", error);
        return {
          extractedItems: [],
          error: error.message || `فشل التواصل مع الذكاء الاصطناعي لتحليل الصورة.`,
        };
    }
  }
);
