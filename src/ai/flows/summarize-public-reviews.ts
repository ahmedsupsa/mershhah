'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReviewSchema = z.object({
  rating: z.number(),
  comment: z.string().optional(),
});

const SummarizePublicReviewsInputSchema = z.object({
  reviews: z.array(ReviewSchema).describe("A list of customer reviews, each with a rating and an optional comment."),
  restaurantName: z.string().describe("The name of the restaurant being reviewed."),
});

export type SummarizePublicReviewsInput = z.infer<typeof SummarizePublicReviewsInputSchema>;

const SummarizePublicReviewsOutputSchema = z.object({
  summaryTitle: z.string().describe("A catchy and positive title for the summary."),
  overallSentiment: z.string().describe("A short, engaging, and positive summary sentence."),
  highlightedThemes: z.array(z.string()).describe("A list of 2-4 main positive points."),
});

export type SummarizePublicReviewsOutput = z.infer<typeof SummarizePublicReviewsOutputSchema>;

export async function summarizePublicReviews(input: SummarizePublicReviewsInput): Promise<SummarizePublicReviewsOutput> {
  return summarizePublicReviewsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizePublicReviewsPrompt',
  input: { schema: SummarizePublicReviewsInputSchema },
  output: { schema: SummarizePublicReviewsOutputSchema },
  prompt: `You are a friendly and positive marketing assistant for a restaurant called "{{restaurantName}}".
Your task is to analyze customer reviews and create a short, attractive summary.

**IMPORTANT:** Focus ONLY on the positive aspects.

Analyze the following reviews:
\`\`\`json
{{{json reviews}}}
\`\`\`

Your final output MUST be a valid JSON object matching the defined output schema in Arabic.
`,
});

const summarizePublicReviewsFlow = ai.defineFlow(
  {
    name: 'summarizePublicReviewsFlow',
    inputSchema: SummarizePublicReviewsInputSchema,
    outputSchema: SummarizePublicReviewsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error("The AI model returned an empty response.");
    }
    return output;
  }
);
