# متغيرات البيئة للإنتاج (Production)

لكي يعمل **المساعد الذكي** بعد نشر الموقع، يجب إضافة المتغيرات التالية في منصة النشر (مثل Vercel أو Netlify).

## مطلوب للمساعد الذكي

| المتغير | الوصف |
|--------|--------|
| `GEMINI_API_KEY` | مفتاح واجهة Google AI (Gemini). احصل عليه من [Google AI Studio](https://aistudio.google.com/apikey). **بدونه سيرد المساعد برسالة "واجهتني مشكلة فنية بسيطة" في الإنتاج.** |

### مثال على الإعداد (Vercel)

1. افتح مشروعك في [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. أضف متغيراً جديداً:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** المفتاح من Google AI Studio
   - **Environment:** Production (واختر Preview إذا أردت)
3. أعد نشر المشروع (Redeploy) بعد الحفظ.

### مثال على الإعداد (Netlify)

1. **Site settings** → **Environment variables** → **Edit variables**.
2. أضف `GEMINI_API_KEY` وقيمته.
3. أعد النشر.

---

## ملاحظات أخرى

- **Firebase:** إذا استخدمت متغيرات البيئة لـ Firebase (مثل `NEXT_PUBLIC_FIREBASE_API_KEY`)، أضفها أيضاً في الإنتاج.
- **سجلات الأخطاء:** إذا ظلت رسالة "مشكلة فنية بسيطة"، راجع سجلات السيرفر (Vercel → Deployments → Function Logs) للتأكد من ظهور خطأ مثل `GEMINI_API_KEY is not set` أو تفاصيل الخطأ من Gemini.
