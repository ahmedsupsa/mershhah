'use server';

/**
 * @fileOverview A Genkit flow to generate a week's worth of social media content for a restaurant.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateWeeklyContentInputSchema = z.object({
  restaurantName: z.string().describe("The name of the restaurant."),
  restaurantType: z.string().describe("The type of restaurant."),
  optionalTheme: z.string().optional().describe("An optional theme for the week.")
});

export type GenerateWeeklyContentInput = z.infer<typeof GenerateWeeklyContentInputSchema>;

const PostSchema = z.object({
  day: z.string().describe("The day of the week (e.g., 'الأحد')."),
  casualCopy: z.string().describe("The post content in a casual, Saudi dialect."),
  formalCopy: z.string().describe("The post content in a more formal, marketing-oriented tone."),
  hashtags: z.string().describe("A string of relevant hashtags."),
  cta: z.string().describe("A clear call to action.")
});

const GenerateWeeklyContentOutputSchema = z.object({
  posts: z.array(PostSchema).length(7).describe("An array of exactly 7 posts.")
});

export type GenerateWeeklyContentOutput = z.infer<typeof GenerateWeeklyContentOutputSchema>;

export async function generateWeeklyContent(input: GenerateWeeklyContentInput): Promise<GenerateWeeklyContentOutput> {
  return generateWeeklyContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWeeklyContentPrompt',
  input: { schema: GenerateWeeklyContentInputSchema },
  output: { schema: GenerateWeeklyContentOutputSchema },
  prompt: `You are a social media manager for restaurants in Saudi Arabia. Your task is to generate a full week (7 days, starting Sunday) of social media posts for "{{restaurantName}}".

The theme for the week is: "{{#if optionalTheme}}{{{optionalTheme}}}{{else}}General Engagement{{/if}}".

Vary the content for each day. Ensure the output is a valid JSON object.
`,
});

const generateWeeklyContentFlow = ai.defineFlow(
  {
    name: 'generateWeeklyContentFlow',
    inputSchema: GenerateWeeklyContentInputSchema,
    outputSchema: GenerateWeeklyContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error('The AI model returned an empty response.');
    }
    return output;
  }
);
