'use server';

/**
 * @fileOverview A Genkit flow to suggest a menu combination based on user preferences.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Simplified schema for what the AI needs to know about each menu item
const AiMenuItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  price: z.number(),
});

const SuggestMenuComboInputSchema = z.object({
  menuItems: z.array(AiMenuItemSchema).describe("The full list of available menu items."),
  peopleCount: z.number().describe("The number of people the meal is for."),
  budget: z.number().describe("The total budget for the entire group in Saudi Riyals."),
  preferences: z.string().optional().describe("Any specific user preferences."),
});

export type SuggestMenuComboInput = z.infer<typeof SuggestMenuComboInputSchema>;

const SuggestedItemSchema = z.object({
    name: z.string().describe("The name of the suggested menu item."),
    quantity: z.number().describe("The quantity of this item to order."),
    reason: z.string().describe("A brief reason why this item was chosen."),
});

const SuggestMenuComboOutputSchema = z.object({
  suggestedItems: z.array(SuggestedItemSchema).describe("A list of suggested menu items and their quantities."),
  totalPrice: z.number().describe("The calculated total price."),
  summary: z.string().describe("A short, friendly summary."),
});

export type SuggestMenuComboOutput = z.infer<typeof SuggestMenuComboOutputSchema>;

export async function suggestMenuCombo(input: SuggestMenuComboInput): Promise<SuggestMenuComboOutput> {
  return suggestMenuComboFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMenuComboPrompt',
  input: { schema: SuggestMenuComboInputSchema },
  output: { schema: SuggestMenuComboOutputSchema },
  prompt: `You are a smart and helpful restaurant assistant for a Saudi restaurant. Your goal is to create a satisfying and budget-conscious meal combination for a group of customers.

**Customer's Request:**
- Number of People: {{{peopleCount}}}
- Total Budget: {{{budget}}} SAR
- Preferences: "{{#if preferences}}{{{preferences}}}{{else}}None specified{{/if}}"

**Available Menu Items (JSON):**
\`\`\`json
{{{json menuItems}}}
\`\`\`

Your final output must be a valid JSON object matching the defined output schema. All text must be in Arabic.`,
});

const suggestMenuComboFlow = ai.defineFlow(
  {
    name: 'suggestMenuComboFlow',
    inputSchema: SuggestMenuComboInputSchema,
    outputSchema: SuggestMenuComboOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error("The AI model returned an empty response.");
    }
    return output;
  }
);
