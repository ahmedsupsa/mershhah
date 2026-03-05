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
  showApplications: z.boolean().optional().describe('Set to true when the reply is about delivery apps and the restaurant has applications, so the UI can show app icons.'),
  showBranches: z.boolean().optional().describe('Set to true when the reply is about branch phone numbers or contact, so the UI can show WhatsApp and "go to branch" options.'),
});
export type RestaurantChatOutput = z.infer<typeof RestaurantChatOutputSchema>;

export async function restaurantChat(input: RestaurantChatInput): Promise<RestaurantChatOutput> {
  return restaurantChatFlow(input);
}

const arabicPrompt = ai.definePrompt({
  name: 'restaurantChatPromptAr',
  input: {schema: RestaurantChatInputSchema},
  output: {schema: RestaurantChatOutputSchema},
  prompt: `أنت رفيق ذكي ومرح لمطعم. مهمتك الرد على العملاء باختصار وودّ، واستخدام بيانات المطعم الفعلية فقط.

بنية بيانات المطعم (JSON):
- name: اسم المطعم
- menu: قائمة أطباق (اسم وسعر)
- offers: العروض الحالية (عنوان ووصف)
- applications: تطبيقات التوصيل/الربط التي أضافها المطعم — كل عنصر فيه name و url (رابط الطلب أو الصفحة). هذه القائمة هي مصدر الحقيقة: إذا كانت تحتوي على عناصر فالمطعم متواجد عليها؛ اذكر الأسماء والروابط ولا تقل إنه غير متواجد.
- branches: الفروع — كل فرع فيه name, address, city, district, opening_hours, phone, google_maps_url. استخدمها للأسئلة عن الفروع والمواعيد وأرقام التواصل.
- socialLinks: روابط التواصل (منصات وقيم). استخدمها عند السؤال عن التواصل.

قواعد:
- رد قصير: جملة أو جملتين عادة. عند سؤال محدد (تطبيقات، فروع، عروض، أرقام) اذكر المعلومة من البيانات فقط ولا تختلق.
- إذا سأل عن تطبيقات التوصيل: استخدم قائمة applications كما هي. إن كانت تحتوي على عناصر فقل بصيغة "موجودين على [اسم التطبيق]" أو "متواجدين على [أسماء التطبيقات]" (مثلاً: "موجودين على نينجا" أو "موجودين على نينجا وهنقرستشن") ثم جملة قصيرة عن الطلب من الرابط. ولا تضع الروابط في النص الطويل؛ الواجهة ستظهر الأيقونات والروابط. وأعد في الاستجابة الحقل showApplications: true عندما يكون الرد عن التطبيقات والقائمة غير فارغة. إن كانت القائمة فارغة فعلاً فقل إنهم غير متواجدين حالياً ولا تعيّن showApplications.
- إذا سأل عن الفروع أو المواعيد أو أرقام التواصل أو رقم الجوال لأي فرع: استخدم branches واذكر المعلومات. وعند السؤال عن رقم الفرع أو التواصل مع الفرع ضَع showBranches: true في الاستجابة (إن وُجدت فروع في البيانات) حتى تظهر واجهة المحادثة خيارَي واتساب والانتقال للفرع.
- إذا سأل عن العروض: اذكر عناوين العروض من offers.
- أسلوب خفيف ولطيف. لا تعدّد أطباق المنيو كاملة إلا إذا سأل "وش عندكم" أو "قائمة الطعام".

### بيانات المطعم (JSON) ###
\`\`\`json
{{{restaurantData}}}
\`\`\`
### نهاية بيانات المطعم ###

رسالة العميل: {{{customerMessage}}}

أجب بناءً على البيانات أعلاه فقط، بجملة أو جملتين قصيرتين. عند سؤال عن التطبيقات اذكر "موجودين على [أسماء التطبيقات]" وضَع showApplications: true إن وُجدت تطبيقات. عند سؤال عن رقم الفرع أو أرقام الفروع أو التواصل مع فرع ضَع showBranches: true إن وُجدت فروع. أعد دائماً كائناً بصيغة JSON: smartReply، showApplications (true عند الرد عن التطبيقات فقط)، showBranches (true عند الرد عن أرقام الفروع/التواصل مع الفرع فقط).
`,
});

const englishPrompt = ai.definePrompt({
  name: 'restaurantChatPromptEn',
  input: {schema: RestaurantChatInputSchema},
  output: {schema: RestaurantChatOutputSchema},
  prompt: `You are a friendly, smart assistant for a restaurant. Reply in short, warm sentences.

Strict rules:
- Keep replies to 1–2 short sentences. e.g. "Hey! How can I help you today?" or "What can I get you?"
- Be light and casual, no long paragraphs or lists unless the customer explicitly asks (e.g. "What do you have?").
- Avoid long marketing text. Brief, friendly replies only.

### Restaurant Data (JSON) ###
\`\`\`json
{{{restaurantData}}}
\`\`\`
### End of Restaurant Data ###

Customer message: {{{customerMessage}}}

Reply in one or two short, friendly sentences only.
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
        return {
          smartReply: output.smartReply ?? '',
          showApplications: output.showApplications === true,
          showBranches: output.showBranches === true,
        };
    } catch (error) {
        console.error("Error in restaurantChatFlow:", error);
        const errorMessage = input.locale === 'en' 
          ? "Sorry, I encountered a small technical issue. Try messaging me again! ☕"
          : 'عفواً، واجهتني مشكلة فنية بسيطة. جرب تراسلني مرة ثانية يا بطل! ☕';
        return { smartReply: errorMessage, showApplications: false, showBranches: false };
    }
  }
);
