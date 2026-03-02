'use server';

/**
 * @fileOverview A Genkit flow that provides smart, friendly, and non-formal replies to customer inquiries.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RestaurantChatInputSchema = z.object({
  customerMessage: z.string().describe('The customer message.'),
  restaurantData: z.string().describe('A JSON string containing all restaurant data.'),
});
export type RestaurantChatInput = z.infer<typeof RestaurantChatInputSchema>;

const RestaurantChatOutputSchema = z.object({
  smartReply: z.string().describe('The AI-generated reply to the customer.'),
});
export type RestaurantChatOutput = z.infer<typeof RestaurantChatOutputSchema>;

export async function restaurantChat(input: RestaurantChatInput): Promise<RestaurantChatOutput> {
  return restaurantChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'restaurantChatPrompt',
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

const restaurantChatFlow = ai.defineFlow(
  {
    name: 'restaurantChatFlow',
    inputSchema: RestaurantChatInputSchema,
    outputSchema: RestaurantChatOutputSchema,
  },
  async input => {
    try {
        const {output} = await prompt(input, { model: 'googleai/gemini-3.1-pro-preview' });
        if (!output) {
            throw new Error('The AI model returned an empty response.');
        }
        return output;
    } catch (error) {
        console.error("Error in restaurantChatFlow:", error);
        return {
            smartReply: 'عفواً، واجهتني مشكلة فنية بسيطة. جرب تراسلني مرة ثانية يا بطل! ☕',
        };
    }
  }
);
