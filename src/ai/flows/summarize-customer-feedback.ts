'use server';

/**
 * @fileOverview A flow that summarizes customer feedback from chat messages.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCustomerFeedbackInputSchema = z.object({
  chatMessages: z
    .array(
      z.object({
        text: z.string().describe('The text content of the chat message.'),
        timestamp: z.string().describe('The timestamp of the chat message.'),
      })
    )
    .describe('An array of customer chat messages.'),
});
export type SummarizeCustomerFeedbackInput = z.infer<
  typeof SummarizeCustomerFeedbackInputSchema
>;

const SummarizeCustomerFeedbackOutputSchema = z.object({
  summary: z
    .string()
    .describe('A summary of the customer feedback.'),
  frequentTopics: z
    .array(z.string())
    .describe('A list of the most frequent topics discussed.'),
  customerSentiment: z
    .string()
    .describe('An overall assessment of customer sentiment.'),
  peakHours: z.string().describe('The peak hours of customer activity.'),
});
export type SummarizeCustomerFeedbackOutput = z.infer<
  typeof SummarizeCustomerFeedbackOutputSchema
>;

export async function summarizeCustomerFeedback(
  input: SummarizeCustomerFeedbackInput
): Promise<SummarizeCustomerFeedbackOutput> {
  return summarizeCustomerFeedbackFlow(input);
}

const summarizeCustomerFeedbackPrompt = ai.definePrompt({
  name: 'summarizeCustomerFeedbackPrompt',
  input: {schema: SummarizeCustomerFeedbackInputSchema},
  output: {schema: SummarizeCustomerFeedbackOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing customer feedback from chat messages for a restaurant.

  Analyze the following chat messages:
  {{#each chatMessages}}
  - {{{text}}} ({{{timestamp}}})
  {{/each}}

  Respond in Arabic. Output in JSON format.
  `,
});

const summarizeCustomerFeedbackFlow = ai.defineFlow(
  {
    name: 'summarizeCustomerFeedbackFlow',
    inputSchema: SummarizeCustomerFeedbackInputSchema,
    outputSchema: SummarizeCustomerFeedbackOutputSchema,
  },
  async input => {
    const {output} = await summarizeCustomerFeedbackPrompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    return output!;
  }
);
