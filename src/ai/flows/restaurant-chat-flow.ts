'use server';

/**
 * @fileOverview A Genkit flow that provides smart, friendly, and non-formal replies to customer inquiries.
 * Supports both Arabic and English based on the locale parameter.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RestaurantChatInputSchema = z.object({
  customerMessage: z.string().describe('The customer message.'),
  restaurantData: z.string().describe('A JSON string containing all restaurant data.'),
  locale: z.enum(['ar', 'en']).default('ar').describe('The language locale for the response.'),
});
export type RestaurantChatInput = z.infer<typeof RestaurantChatInputSchema>;

const RestaurantChatOutputSchema = z.object({
  smartReply: z.string().describe('The AI-generated reply to the customer.'),
});
export type RestaurantChatOutput = z.infer<typeof RestaurantChatOutputSchema>;

export async function restaurantChat(input: RestaurantChatInput): Promise<RestaurantChatOutput> {
  return restaurantChatFlow(input);
}

const arabicPrompt = ai.definePrompt({
  name: 'restaurantChatPromptAr',
  input: {schema: RestaurantChatInputSchema},
  output: {schema: RestaurantChatOutputSchema},
  prompt: `أنت رفيق ذكي ومرح لمطعم ومركز نمو رقمي. مهمتك هي الإجابة على أسئلة العملاء بأسلوب "خفيف"، جميل، وغير رسمي تماماً. كن صديقاً للعميل وليس موظفاً آلياً.

### بيانات المطعم (JSON) ###
\`\`\`json
{{{restaurantData}}}
\`\`\`
### نهاية بيانات المطعم ###

رسالة العميل: {{{customerMessage}}}

صُغ إجابة "جميلة" و"خفيفة" تجعل العميل يبتسم ويشعر بالرغبة في الطلب فوراً.
`,
});

const englishPrompt = ai.definePrompt({
  name: 'restaurantChatPromptEn',
  input: {schema: RestaurantChatInputSchema},
  output: {schema: RestaurantChatOutputSchema},
  prompt: `You are a friendly and smart assistant for a restaurant and digital growth hub. Your job is to answer customer questions in a fun, friendly, and casual manner. Be a friend to the customer, not a robotic employee.

### Restaurant Data (JSON) ###
\`\`\`json
{{{restaurantData}}}
\`\`\`
### End of Restaurant Data ###

Customer message: {{{customerMessage}}}

Craft a friendly and engaging reply that makes the customer smile and want to order right away.
`,
});

const restaurantChatFlow = ai.defineFlow(
  {
    name: 'restaurantChatFlow',
    inputSchema: RestaurantChatInputSchema,
    outputSchema: RestaurantChatOutputSchema,
  },
  async input => {
    try {
        const selectedPrompt = input.locale === 'en' ? englishPrompt : arabicPrompt;
        const {output} = await selectedPrompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
        if (!output) {
            throw new Error('The AI model returned an empty response.');
        }
        return output;
    } catch (error) {
        console.error("Error in restaurantChatFlow:", error);
        const errorMessage = input.locale === 'en' 
          ? "Sorry, I encountered a small technical issue. Try messaging me again! ☕"
          : 'عفواً، واجهتني مشكلة فنية بسيطة. جرب تراسلني مرة ثانية يا بطل! ☕';
        return {
            smartReply: errorMessage,
        };
    }
  }
);
