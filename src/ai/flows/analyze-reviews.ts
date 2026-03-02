'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ReviewSchema = z.object({
  rating: z.number(),
  comment: z.string().optional(),
});

const AnalyzeReviewsInputSchema = z.object({
  reviews: z.array(ReviewSchema).describe("A list of customer reviews, each with a rating and an optional comment."),
  restaurantName: z.string().describe("The name of the restaurant being reviewed."),
});

export type AnalyzeReviewsInput = z.infer<typeof AnalyzeReviewsInputSchema>;

const AnalyzeReviewsOutputSchema = z.object({
  positiveThemes: z.array(z.string()).describe("A list of 2-3 common positive themes mentioned in the comments."),
  negativeThemes: z.array(z.string()).describe("A list of 2-3 common negative themes or areas for improvement."),
  actionableInsight: z.string().describe("One single, clear, and highly practical recommendation for the owner based on the feedback."),
  sentimentScore: z.number().min(0).max(100).describe("An overall sentiment score from 0 (very negative) to 100 (very positive)."),
});

export type AnalyzeReviewsOutput = z.infer<typeof AnalyzeReviewsOutputSchema>;

export async function analyzeReviews(input: AnalyzeReviewsInput): Promise<AnalyzeReviewsOutput> {
  return analyzeReviewsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeReviewsPrompt',
  input: { schema: AnalyzeReviewsInputSchema },
  output: { schema: AnalyzeReviewsOutputSchema },
  prompt: `You are an expert restaurant data analyst. Your task is to analyze customer reviews for a restaurant called "{{restaurantName}}" and provide a concise, actionable summary in Arabic.

Analyze the following reviews:
\`\`\`json
{{{json reviews}}}
\`\`\`

Based on the provided data, perform the following analysis:

1.  **Sentiment Score:** Calculate an overall sentiment score from 0 to 100.
2.  **Positive Themes:** Identify 2-3 main positive points.
3.  **Negative Themes:** Identify 2-3 main negative points.
4.  **Actionable Insight:** Provide one single, powerful recommendation.

Your final output MUST be a valid JSON object matching the defined output schema.
`,
});

const analyzeReviewsFlow = ai.defineFlow(
  {
    name: 'analyzeReviewsFlow',
    inputSchema: AnalyzeReviewsInputSchema,
    outputSchema: AnalyzeReviewsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error("The AI model returned an empty response.");
    }
    return output;
  }
);
