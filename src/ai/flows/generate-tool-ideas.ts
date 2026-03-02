'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateToolIdeaInputSchema = z.object({
  category: z.string().describe("The category for the new tool idea (e.g., 'marketing', 'operations', 'analytics')."),
  existingTools: z.array(z.string()).describe("A list of existing tool titles to avoid generating duplicates."),
});

export type GenerateToolIdeaInput = z.infer<typeof GenerateToolIdeaInputSchema>;

const GeneratedToolSchema = z.object({
  id: z.string().min(3).regex(/^[a-z0-9-]+$/).describe("A unique, URL-friendly ID in English."),
  title: z.string().describe("A catchy and clear title for the tool in Arabic."),
  description: z.string().describe("A concise and compelling description in Arabic."),
  icon: z.string().describe("The most relevant icon name from the Lucide-React icon library."),
  color: z.string().regex(/^text-/).describe("A Tailwind CSS class for the icon color."),
  bg_color: z.string().regex(/^bg-/).describe("A Tailwind CSS class for the header background color."),
});

const GenerateToolIdeaOutputSchema = GeneratedToolSchema;
export type GenerateToolIdeaOutput = z.infer<typeof GenerateToolIdeaOutputSchema>;


export async function generateToolIdea(input: GenerateToolIdeaInput): Promise<GeneratedToolIdeaOutput> {
  return generateToolIdeaFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateToolIdeaPrompt',
  input: { schema: GenerateToolIdeaInputSchema },
  output: { schema: GenerateToolIdeaOutputSchema },
  prompt: `You are an expert product manager for a SaaS platform for restaurants called "Mershhah". Your task is to brainstorm a new, creative, and useful tool idea for restaurant owners.

The tool should fall under the category: **{{{category}}}**.

Your final output must be a valid JSON object matching the defined output schema.
`,
});

const generateToolIdeaFlow = ai.defineFlow(
  {
    name: 'generateToolIdeaFlow',
    inputSchema: GenerateToolIdeaInputSchema,
    outputSchema: GenerateToolIdeaOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error("The AI model returned an empty response.");
    }
    return output;
  }
);
