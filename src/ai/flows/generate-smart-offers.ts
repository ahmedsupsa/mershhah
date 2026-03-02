'use server';

/**
 * @fileOverview A Genkit flow for generating smart, data-driven offers based on menu item costs and profit margins.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the flow
const MenuItemCostingSchema = z.object({
  name: z.string(),
  cost: z.number(),
  price: z.number(),
});

const GenerateSmartOffersInputSchema = z.object({
  menuItems: z.array(MenuItemCostingSchema).describe("A list of menu items with their name, cost, and price."),
  targetMargin: z.number().min(0).max(100).describe("The desired profit margin percentage the restaurant owner wants to achieve."),
  restaurantType: z.string().describe("The type of the restaurant (e.g., 'مطعم برجر', 'مقهى', 'مطعم إيطالي')."),
});

export type GenerateSmartOffersInput = z.infer<typeof GenerateSmartOffersInputSchema>;

// Schema for a single suggested offer
const SuggestedOfferSchema = z.object({
  title: z.string().describe('A catchy and creative title for the offer in Arabic.'),
  description: z.string().describe('A persuasive description of the offer, explaining why it is a good deal for the customer and what it includes.'),
  itemsIncluded: z.array(z.string()).describe("An array of the names of the menu items included in this offer."),
  suggestedPrice: z.number().describe("The calculated suggested selling price for the offer/bundle."),
  resultingProfitMargin: z.number().describe("The final calculated profit margin percentage for this specific offer."),
});

// Output schema
const GenerateSmartOffersOutputSchema = z.object({
  offers: z.array(SuggestedOfferSchema).describe('An array of up to 3 distinct and creative offer ideas.'),
  error: z.string().optional().describe('An error message if the operation failed.'),
});

export type GenerateSmartOffersOutput = z.infer<typeof GenerateSmartOffersOutputSchema>;

// The server action that the frontend will call
export async function generateSmartOffers(input: GenerateSmartOffersInput): Promise<GenerateSmartOffersOutput> {
  return generateSmartOffersFlow(input);
}

// The prompt definition
const prompt = ai.definePrompt({
  name: 'generateDataDrivenSmartOffersPrompt',
  input: { schema: GenerateSmartOffersInputSchema },
  output: { schema: z.object({ offers: z.array(SuggestedOfferSchema) }) },
  prompt: `You are an expert restaurant consultant specializing in menu engineering and profitability for the Saudi market.
Your task is to create up to 3 compelling and profitable offers based on a restaurant's menu data and their desired profit margin.

**Restaurant Details:**
- Type: {{{restaurantType}}}
- Target Profit Margin: {{{targetMargin}}}%

**Menu Items Data (Name, Cost, Price):**
\`\`\`json
{{{json menuItems}}}
\`\`\`

Your final output MUST be a valid JSON object containing a key "offers" with an array of up to 3 offer objects. All text should be in Arabic.
`,
});

// The Genkit flow definition
const generateSmartOffersFlow = ai.defineFlow(
  {
    name: 'generateDataDrivenSmartOffersFlow',
    inputSchema: GenerateSmartOffersInputSchema,
    outputSchema: GenerateSmartOffersOutputSchema,
  },
  async (input): Promise<GenerateSmartOffersOutput> => {
    try {
      const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
      if (!output) {
        throw new Error("The AI model returned an empty response.");
      }
      return { offers: output.offers };
    } catch (error: any) {
        console.error("Error in generateSmartOffersFlow:", error);
        return {
          offers: [],
          error: error.message || `فشل التواصل مع الذكاء الاصطناعي`,
        };
    }
  }
);
