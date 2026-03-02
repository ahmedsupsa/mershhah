'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating Arabic descriptions for menu items.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMenuDescriptionsInputSchema = z.object({
  menuItemName: z.string().describe('The name of the menu item.'),
  menuItemType: z.string().describe('The type of the menu item (e.g., appetizer, main course, dessert).'),
  existingDescription: z.string().optional().describe('The existing description of the menu item, if any.'),
  restaurantType: z.string().describe('The type of restaurant (e.g., Lebanese, Italian, Fast Food).'),
  targetAudience: z.string().describe('Description of the target customer of the restaurant.'),
});

export type GenerateMenuDescriptionsInput = z.infer<typeof GenerateMenuDescriptionsInputSchema>;

const GenerateMenuDescriptionsOutputSchema = z.object({
  arabicDescription: z.string().describe('The generated Arabic description for the menu item.'),
});

export type GenerateMenuDescriptionsOutput = z.infer<typeof GenerateMenuDescriptionsOutputSchema>;

export async function generateMenuDescriptions(input: GenerateMenuDescriptionsInput): Promise<GenerateMenuDescriptionsOutput> {
  return generateMenuDescriptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMenuDescriptionsPrompt',
  input: {schema: GenerateMenuDescriptionsInputSchema},
  output: {schema: GenerateMenuDescriptionsOutputSchema},
  prompt: `أنت مؤلف إعلانات خبير متخصص في صياغة أوصاف عربية مقنعة ووصفية لأصناف قائمة الطعام. هدفك هو إنشاء أوصاف جذابة وغنية بالمعلومات، تخبر العميل بالضبط بما يحتويه الطبق.

**المعلومات المتاحة:**
  اسم الصنف: {{{menuItemName}}}
  نوع الصنف: {{{menuItemType}}}
  الوصف الحالي: {{{existingDescription}}}
  نوع المطعم: {{{restaurantType}}}
  الجمهور المستهدف: {{{targetAudience}}}

يجب أن يكون الناتج النهائي الخاص بك كائن JSON صالحًا بالمفتاح "arabicDescription".
  `,
});

const generateMenuDescriptionsFlow = ai.defineFlow(
  {
    name: 'generateMenuDescriptionsFlow',
    inputSchema: GenerateMenuDescriptionsInputSchema,
    outputSchema: GenerateMenuDescriptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
    return output!;
  }
);
