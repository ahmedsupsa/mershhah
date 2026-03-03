'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { generateMenuImage } from './generate-menu-image';

const AssistantInputSchema = z.object({
  question: z.string().describe("The user's question about the Mershhah dashboard."),
  currentPage: z.string().describe("The current page the user is on, to provide context."),
  menuItems: z.array(z.any()).optional().describe("An optional array of the user's menu items to provide data context for analysis."),
  locale: z.enum(['ar', 'en']).default('ar').describe('The language locale for the response.'),
});

export type AssistantInput = z.infer<typeof AssistantInputSchema>;

const SuggestedActionSchema = z.object({
  actionLabel: z.string().describe("The text for the confirmation button, e.g., 'نعم، قم بالتعديل'"),
  actionType: z.string().describe("A unique identifier for the action. Use 'UPDATE_MENU_ITEM' for a single item update, or 'BULK_UPDATE_MENU_ITEMS' for updating multiple items at once."),
  actionPayload: z.any().describe("The data needed to perform the action. For 'UPDATE_MENU_ITEM', this is `{ itemId: string, updates: object }`. For 'BULK_UPDATE_MENU_ITEMS', this is an array: `[{ itemId: string, updates: object }]`."),
}).describe("A suggested action for the user to confirm.");

const AssistantOutputSchema = z.object({
  answer: z.string().describe("A helpful and friendly answer in Arabic."),
  generatedImage: z.string().optional().describe("A data URI for a newly generated image, if one was created."),
  suggestedAction: SuggestedActionSchema.optional(),
});

export type AssistantOutput = z.infer<typeof AssistantOutputSchema>;

// Define a tool for generating images.
const generateImageTool = ai.defineTool(
  {
    name: 'generateMenuImageTool',
    description: 'Generates a photorealistic image for a menu item based on its name and description. Use this when the user asks to create, generate, or make a picture or image for one of their dishes.',
    inputSchema: z.object({
      itemName: z.string().describe('The name of the menu item.'),
      itemDescription: z.string().optional().describe('The description of the menu item.'),
    }),
    outputSchema: z.object({
      imageDataUri: z.string().describe("The generated image as a data URI."),
    }),
  },
  async (input) => {
    return generateMenuImage({
      ...input,
      style: 'clean_white_background'
    });
  }
);


export async function dashboardAssistant(input: AssistantInput): Promise<AssistantOutput> {
  return assistantFlow(input);
}

const arabicPrompt = ai.definePrompt({
    name: 'dashboardAssistantPromptAr',
    tools: [generateImageTool],
    input: { schema: AssistantInputSchema },
    output: { schema: AssistantOutputSchema },
    prompt: `أنت "رفيق الدرب"، مساعد ذكاء اصطناعي خبير وفاهم لأصحاب المشاريع. مهمتك هي تكون الصديق اللي يساعد ويرشد ويجاوب على أي سؤال، وبلهجة عامية بسيطة ومباشرة.

**سياق المستخدم:**
*   **الصفحة الحالية:** {{{currentPage}}}
*   **سؤال المستخدم:** "{{{question}}}"

---

**بيانات المشروع (إذا فيه):**
{{#if menuItems}}
*   **بيانات المنيو:**
\`\`\`json
{{{json menuItems}}}
\`\`\`
{{/if}}

الآن، بناءً على كل هذا، جاوب على سؤال المستخدم، وابحث عن مشكلة في البيانات، واقترح حلاً قابلاً للتنفيذ.
`,
});

const englishPrompt = ai.definePrompt({
    name: 'dashboardAssistantPromptEn',
    tools: [generateImageTool],
    input: { schema: AssistantInputSchema },
    output: { schema: AssistantOutputSchema },
    prompt: `You are "Companion", an expert AI assistant who understands business owners. Your job is to be a helpful friend who guides and answers any question in a simple, friendly, and direct manner.

**User Context:**
*   **Current Page:** {{{currentPage}}}
*   **User Question:** "{{{question}}}"

---

**Project Data (if available):**
{{#if menuItems}}
*   **Menu Data:**
\`\`\`json
{{{json menuItems}}}
\`\`\`
{{/if}}

Now, based on all this, answer the user's question, look for any issues in the data, and suggest actionable solutions.
`,
});


const assistantFlow = ai.defineFlow(
  {
    name: 'dashboardAssistantFlow',
    inputSchema: AssistantInputSchema,
    outputSchema: AssistantOutputSchema,
  },
  async (input) => {
    const plainMenuItems = JSON.parse(JSON.stringify(input.menuItems));
    const selectedPrompt = input.locale === 'en' ? englishPrompt : arabicPrompt;
    const { output } = await selectedPrompt({ ...input, menuItems: plainMenuItems }, { model: 'googleai/gemini-3.1-pro-preview' });
    if (!output) {
      throw new Error("The AI model returned an empty response.");
    }
    return output;
  }
);
