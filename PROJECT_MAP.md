
# خريطة مشروع مائدتي (Mershhah)

## 1. وصف عام للمشروع

بناءً على تحليل الملفات، "مائدتي" هو تطبيق ويب متكامل (SaaS) موجه لأصحاب المطاعم في السعودية. المشروع مبني باستخدام Next.js ويوفر نظامًا متعدد الأدوار (Multi-tenant) مع لوحات تحكم منفصلة للمدير العام (Admin) وصاحب المطعم (Owner)، بالإضافة إلى واجهات تفاعلية للعميل النهائي.

**الوظائف الأساسية المستنبطة من الكود:**
- **نظام مصادقة وتسجيل:** يسمح للمستخدمين (أصحاب مطاعم) بإنشاء حسابات وتسجيل الدخول.
- **لوحة تحكم للمدير:** إدارة المشتركين (المطاعم)، تفعيل الحسابات، إدارة متجر الأدوات، ودعم فني.
- **لوحة تحكم لصاحب المطعم:** إدارة قائمة الطعام (المنيو)، إدارة العروض، تخصيص هوية المطعم، والوصول إلى أدوات إضافية من المتجر.
- **واجهات عملاء ديناميكية:** صفحات عامة لكل مطعم (`/menu/[username]`, `/hub/[username]`) تعرض المنيو وتوفر مساعدًا ذكيًا (شات بوت) للتفاعل.
- **قدرات الذكاء الاصطناعي (AI):** استخدام Genkit و Gemini لإنشاء أوصاف للمنيو، تلخيص آراء العملاء، وتقديم ردود ذكية في المحادثات.

---

## 2. شجرة المجلدات الأساسية وشرحها

```
.
├── src/
│   ├── app/                # الصفحات والمسارات (App Router)
│   ├── components/         # مكونات React القابلة لإعادة الاستخدام
│   ├── services/           # دوال للتواصل مع قاعدة البيانات (Supabase)
│   ├── ai/                 # منطق الذكاء الاصطناعي (Genkit Flows)
│   ├── lib/                # أدوات مساعدة، أنواع البيانات (types)، وعملاء Supabase
│   ├── hooks/              # React Hooks مخصصة (مثل useUser)
│   ├── data/               # بيانات تجريبية (تم إفراغه)
│   └── blog/               # محتوى وبيانات المدونة
├── docs/                   # ملفات التوثيق (مثل backend.json)
└── public/                 # الملفات الثابتة (غير موجود حالياً)
```

### شرح وظيفة كل مجلد:

- **`src/app`**: قلب التطبيق الذي يعتمد على Next.js App Router. يحتوي على مجلدات فرعية تنظم المسارات حسب الأدوار (`admin`, `owner`) والصفحات العامة (`blog`, `pricing`). ملف `layout.tsx` هو القالب الرئيسي للتطبيق.
- **`src/components`**: يحتوي على جميع مكونات React، مقسمة إلى:
    - `ui`: مكونات أساسية من ShadCN (Button, Card, Input).
    - `shared`: مكونات مشتركة بين أجزاء مختلفة من التطبيق (Logo, Header, Sidebars).
    - `auth`: نماذج تسجيل الدخول، التسجيل، واستعادة كلمة المرور.
    - `admin` / `dashboard`: مكونات خاصة بلوحات التحكم.
- **`src/services`**: طبقة الوصول للبيانات. يحتوي على `restaurant.service.ts` الذي يصدر دوال `async` للتفاعل مع Supabase (جلب بيانات، تحديث، حذف).
- **`src/ai`**: مركز عمليات الذكاء الاصطناعي.
    - `genkit.ts`: يقوم بتهيئة وإعداد Genkit.
    - `flows/`: يحتوي على "تدفقات" Genkit التي تعرف المنطق لاستدعاء نماذج Gemini AI.
- **`src/lib`**: مكتبة الأدوات المساعدة.
    - `utils.ts`: أدوات مساعدة عامة (مثل `cn` لـ Tailwind).
    - `types.ts`: تعريفات TypeScript لأنواع البيانات الرئيسية (Profile, MenuItem).
    - `supabase/`: يحتوي على إعدادات عميل Supabase للاتصال من جهة الخادم والمتصفح.
- **`src/hooks`**: يحتوي على React Hooks مخصصة، وأهمها `useUser` لجلب بيانات المستخدم المسجل دخوله.
- **`src/blog`**: يحتوي على `posts.ts` الذي يخزن محتوى مقالات المدونة كبيانات ثابتة.
- **`docs`**: يحتوي على ملفات توثيقية مثل `backend.json` الذي يصف مخطط قاعدة البيانات وكياناتها.

---

## 3. المكونات الرئيسية والمنطق التجاري

- **نقاط الدخول الرئيسية (Entry Points):**
    - `src/app/layout.tsx`: الملف الجذري الذي يطبق الـ layout الأساسي على كل صفحات التطبيق.
    - `src/app/page.tsx`: الصفحة الرئيسية للموقع.
    - `src/middleware.ts`: يعترض الطلبات لتحديث جلسات Supabase.

- **الصفحات الأساسية:**
    - **عام:** `/`, `/login`, `/register`, `/pricing`, `/blog`, `/menu/[username]`, `/hub/[username]`.
    - **المدير:** `/admin/dashboard`, `/admin/management`, `/admin/financials`.
    - **صاحب المطعم:** `/owner/dashboard`, `/owner/menu`, `/owner/offers`, `/owner/customize`.

- **الخدمات (Services):**
    - **`src/services/restaurant.service.ts`**: يحتوي على دوال مثل `getRestaurants`, `getMenuByRestaurantId`, `updateRestaurantSettings` التي تتفاعل مباشرة مع Supabase. هذا هو المصدر الوحيد لمنطق جلب البيانات من جهة الخادم.

- **المنطق التجاري (Business Logic):**
    - **المصادقة (Auth):** موجود في مكونات `src/components/auth` (LoginForm, RegisterForm) ويتصل مباشرة بـ `Supabase Auth`.
    - **التحقق من الصلاحيات:** يتم داخل `AccountStatusChecker.tsx` بناءً على بيانات `useUser`، ويقوم بعرض المحتوى أو حجبه بناءً على دور المستخدم وحالة حسابه.
    - **منطق الذكاء الاصطناعي:** معزول بالكامل داخل مجلد `src/ai/flows`.
    - **إدارة البيانات:** يتم استدعاء الدوال من `restaurant.service.ts` داخل Server Components (مثل `management/page.tsx`) أو باستخدام `useEffect` في Client Components.

---

## 4. التقنيات المستخدمة

- **Framework:** Next.js (مع App Router)
- **لغة البرمجة:** TypeScript
- **قاعدة البيانات والمصادقة:** Supabase (PostgreSQL, Auth, Storage)
- **الذكاء الاصطناعي:** Genkit, Google Gemini
- **الواجهة الأمامية (UI):** React, Shadcn/UI
- **التصميم والـ Styling:** Tailwind CSS
- **الأيقونات:** Lucide React
- **الـ Animation:** Framer Motion
- **التحقق من النماذج:** React Hook Form, Zod

---

## 5. خريطة تدفق البيانات المبسطة

### أ. تدفق جلب البيانات (مثال: عرض قائمة المشتركين)

1.  **المستخدم (المدير)**: يزور صفحة `/admin/management`.
2.  **Next.js (Server Component):** يتم تنفيذ `src/app/admin/management/page.tsx` على الخادم.
3.  **Service Call:** الصفحة تستدعي دالة `getRestaurants()` من `src/services/restaurant.service.ts`.
4.  **Supabase Client:** الدالة `getRestaurants` تستخدم `createSupabaseServerClient()` للتواصل مع قاعدة بيانات Supabase.
5.  **Database:** يتم جلب البيانات من جدول `profiles`.
6.  **Rendering:** يتم تمرير البيانات إلى مكون `RestaurantsTable` لعرضها كـ HTML للمستخدم.

### ب. تدفق تعديل البيانات (مثال: إضافة طبق جديد)

1.  **المستخدم (صاحب المطعم):** يملأ نموذج "إضافة طبق" في `EditMenuItemDialog.tsx` ويضغط "حفظ".
2.  **React (Client Component):** يتم تفعيل دالة `onSubmit`.
3.  **Supabase Client:** الدالة `onSubmit` تستخدم `createSupabaseBrowserClient()` لإرسال طلب `insert` إلى جدول `menu_items` في قاعدة بيانات Supabase.
4.  **Database:** يتم حفظ البيانات الجديدة.
5.  **UI Update:** يتم تحديث واجهة المستخدم (إغلاق النافذة، عرض رسالة نجاح، إعادة جلب البيانات).

### ج. تدفق الذكاء الاصطناعي (مثال: إنشاء وصف)

1.  **المستخدم:** يضغط على زر "إنشاء وصف ذكي" في أحد النماذج.
2.  **React (Client Component):** يتم استدعاء دالة Server Action (غير موجودة حاليًا، ولكن هذا هو التدفق المعتاد).
3.  **Server Action:** تستدعي دالة `generateMenuDescriptions` من `src/ai/flows/generate-menu-descriptions.ts`.
4.  **Genkit Flow:** الدالة `generateMenuDescriptions` تستدعي `prompt` المعرّف مسبقًا مع مدخلات المستخدم.
5.  **Google AI:** يقوم Genkit بإرسال الطلب إلى نموذج Gemini.
6.  **Response:** يتم إرجاع الاستجابة (الوصف الجديد) إلى الواجهة الأمامية لعرضها.
