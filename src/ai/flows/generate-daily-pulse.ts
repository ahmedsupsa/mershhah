'use server';

/**
 * @fileOverview A Genkit flow to generate a "Daily Pulse" summary for a restaurant owner.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DailyPulseInputSchema = z.object({
  restaurantName: z.string(),
  mostDiscussedItem: z.string().describe("The menu item most frequently mentioned in customer chats from the previous day. Can be 'N/A' if no data."),
  peakActivityHour: z.string().describe("The busiest hour of the day based on customer interactions (e.g., '5 PM - 6 PM'). Can be 'N/A'."),
  totalInteractions: z.number().describe("The total number of customer interactions (e.g., messages received).")
});

export type DailyPulseInput = z.infer<typeof DailyPulseInputSchema>;

const DailyPulseOutputSchema = z.object({
  pulseSummary: z.string().describe("A very short, engaging summary of the day's activity in one sentence. E.g., 'كان يوماً حافلاً بالحديث عن الشاورما، خصوصاً في فترة المساء!'."),
  singleActionableRecommendation: z.string().describe("One single, clear, and highly practical recommendation for the owner to consider for the next day. It should be directly related to the provided data.")
});

export type DailyPulseOutput = z.infer<typeof DailyPulseOutputSchema>;

export async function generateDailyPulse(input: DailyPulseInput): Promise<DailyPulseOutput> {
  return generateDailyPulseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDailyPulsePrompt',
  input: { schema: DailyPulseInputSchema },
  output: { schema: DailyPulseOutputSchema },
  prompt: `You are an AI business analyst for a restaurant named "{{restaurantName}}". Your goal is to provide a super quick, insightful "Daily Pulse" summary based on the previous day's data. The tone should be encouraging and smart, in Arabic.

Yesterday's Data:
- Most Discussed Item by Customers: {{{mostDiscussedItem}}}
- Peak Activity Hour: {{{peakActivityHour}}}
- Total Customer Interactions: {{{totalInteractions}}}

Your response must be in the specified JSON format.
`,
});

const generateDailyPulseFlow = ai.defineFlow(
  {
    name: 'generateDailyPulseFlow',
    inputSchema: DailyPulseInputSchema,
    outputSchema: DailyPulseOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error('The AI model returned an empty response.');
    }
    return output;
  }
);
