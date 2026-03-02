'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema: the logo image as a data URI
const SuggestPaletteInputSchema = z.object({
  logoDataUri: z.string().describe("A data URI of the restaurant's logo image."),
});
export type SuggestPaletteInput = z.infer<typeof SuggestPaletteInputSchema>;

// Output schema: the suggested color palette
const SuggestPaletteOutputSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe("The suggested primary color in hex format (e.g., #RRGGBB). Should be a dominant and attractive color from the logo."),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe("The suggested secondary/background color in hex format. Should be a light, neutral color that complements the primary color, suitable for a page background."),
  buttonTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).describe("The suggested text color for buttons that use the primary color as their background. Should be either black (#000000) or white (#FFFFFF) for maximum contrast and readability."),
});
export type SuggestPaletteOutput = z.infer<typeof SuggestPaletteOutputSchema>;


// The exported server action that the frontend will call.
export async function suggestColorPalette(input: SuggestPaletteInput): Promise<SuggestPaletteOutput> {
  return suggestColorPaletteFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestColorPalettePrompt',
  input: { schema: SuggestPaletteInputSchema },
  output: { schema: SuggestPaletteOutputSchema },
  prompt: `You are a professional UI/UX designer with an expert eye for color theory and branding.
Your task is to analyze a restaurant's logo and suggest a beautiful, modern, and accessible color palette for their digital interface (like a web app).

**Logo Image:**
{{media url=logoDataUri}}

**Instructions:**
1.  **Analyze the Logo:** Identify the dominant and accent colors in the logo.
2.  **Suggest Primary Color:** Choose the most prominent, brand-defining color from the logo. This will be the primary color for buttons, links, and highlights. Return it as a hex code (e.g., #4F46E5).
3.  **Suggest Secondary/Background Color:** Choose a very light, near-white, or complementary neutral color. This will be the main background for the pages. It must have high contrast with the primary color and black text. A safe choice is often a very light grey or a tinted white. Return it as a hex code (e.g., #F9FAFB).
4.  **Suggest Button Text Color:** Based on the primary color you chose, determine whether black (#000000) or white (#FFFFFF) text would be more readable on a button with that primary color as its background. Prioritize accessibility and high contrast (WCAG AA standard).

Your final output MUST be a valid JSON object matching the defined output schema. Do not include any extra text or explanations.
`,
});


const suggestColorPaletteFlow = ai.defineFlow(
  {
    name: 'suggestColorPaletteFlow',
    inputSchema: SuggestPaletteInputSchema,
    outputSchema: SuggestPaletteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error('The AI model returned an empty response.');
    }
    return output;
  }
);
