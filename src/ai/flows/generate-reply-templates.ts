'use server';

/**
 * @fileOverview A Genkit flow to generate contextual reply templates for customer service.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReplyTemplatesInputSchema = z.object({
  scenario: z.enum([
    'order_delay',
    'item_unavailable',
    'complaint_food_quality',
    'complaint_service',
    'positive_feedback',
    'booking_inquiry',
    'general_inquiry'
  ]).describe("The customer service scenario for which to generate replies."),
  restaurantName: z.string().describe("The name of the restaurant.")
});

export type ReplyTemplatesInput = z.infer<typeof ReplyTemplatesInputSchema>;

const ReplyTemplatesOutputSchema = z.object({
  shortReply: z.string().describe("A very brief, quick reply suitable for instant messaging."),
  empatheticReply: z.string().describe("A more detailed, empathetic, and professional reply that shows care."),
  deEscalationReply: z.string().describe("A reply specifically designed to de-escalate a negative situation.")
});

export type ReplyTemplatesOutput = z.infer<typeof ReplyTemplatesOutputSchema>;

export async function generateReplyTemplates(input: ReplyTemplatesInput): Promise<ReplyTemplatesOutput> {
  return generateReplyTemplatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReplyTemplatesPrompt',
  input: { schema: ReplyTemplatesInputSchema },
  output: { schema: ReplyTemplatesOutputSchema },
  prompt: `You are a customer service expert for restaurants in Saudi Arabia. Your task is to generate three distinct reply templates in Arabic for a given scenario at a restaurant named "{{restaurantName}}".

Scenario: {{{scenario}}}

Ensure the tone is appropriate for the Saudi market. The output must be a valid JSON object.
`,
});

const generateReplyTemplatesFlow = ai.defineFlow(
  {
    name: 'generateReplyTemplatesFlow',
    inputSchema: ReplyTemplatesInputSchema,
    outputSchema: ReplyTemplatesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error('The AI model returned an empty response.');
    }
    return output;
  }
);
