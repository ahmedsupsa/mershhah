'use server';

/**
 * @fileOverview A Genkit flow to analyze a restaurant's menu for health and profitability.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeMenuHealthInputSchema = z.object({
  menuItems: z.array(z.any()).describe("A JSON array of the restaurant's menu items, including name, description, category, and price."),
  restaurantType: z.string().describe("The type of restaurant (e.g., 'Italian', 'Saudi', 'Fast Food').")
});

export type AnalyzeMenuHealthInput = z.infer<typeof AnalyzeMenuHealthInputSchema>;

const AnalyzeMenuHealthOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe("An overall health score for the menu from 0 to 100."),
  positivePoints: z.array(z.string()).describe("A list of strengths found in the menu."),
  areasForImprovement: z.array(z.string()).describe("A list of weaknesses or areas for improvement."),
  top5ActionableRecommendations: z.array(z.string()).describe("The top 5 most impactful and actionable recommendations for the owner."),
  professionalDescriptionTemplate: z.string().describe("A professional and enticing template for writing menu item descriptions that the owner can use.")
});

export type AnalyzeMenuHealthOutput = z.infer<typeof AnalyzeMenuHealthOutputSchema>;

export async function analyzeMenuHealth(input: AnalyzeMenuHealthInput): Promise<AnalyzeMenuHealthOutput> {
  return analyzeMenuHealthFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMenuHealthPrompt',
  input: { schema: AnalyzeMenuHealthInputSchema },
  output: { schema: AnalyzeMenuHealthOutputSchema },
  prompt: `You are a world-class restaurant consultant specializing in menu engineering and optimization for a Saudi audience. Your task is to analyze a restaurant's menu and provide a concise, actionable "Menu Health Check."

Restaurant Type: {{{restaurantType}}}
Menu Items (JSON):
\`\`\`json
{{{json menuItems}}}
\`\`\`

Based on the provided data, perform the following analysis in Arabic:

1.  **Overall Score:** Give the menu a health score out of 100.
2.  **Positive Points:** Identify 2-3 key strengths of the menu.
3.  **Areas for Improvement:** Identify 2-3 critical weaknesses.
4.  **Top 5 Actionable Recommendations:** Provide a list of the 5 most important and practical steps the owner should take.
5.  **Professional Description Template:** Provide a versatile, professional, and enticing template in Arabic.

Your final output MUST be a valid JSON object matching the defined output schema.
`,
});

const analyzeMenuHealthFlow = ai.defineFlow(
  {
    name: 'analyzeMenuHealthFlow',
    inputSchema: AnalyzeMenuHealthInputSchema,
    outputSchema: AnalyzeMenuHealthOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error('The AI model returned an empty response.');
    }
    return output;
  }
);
