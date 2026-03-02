'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Send, CheckCircle, LifeBuoy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const ticketSchema = z.object({
  name: z.string().min(3, { message: 'الاسم مطلوب.' }),
  email: z.string().email({ message: 'بريد إلكتروني غير صالح.' }),
  subject: z.string().min(5, { message: 'الموضوع مطلوب.' }),
  message: z.string().min(10, { message: 'الرسالة يجب أن تكون 10 أحرف على الأقل.' }),
});

export default function SupportPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, startSubmitting] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        const q = query(collection(db, "restaurants"), where("username", "==", username), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setRestaurant(null);
        } else {
          setRestaurant({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [username]);

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    if (!restaurant) return;
    startSubmitting(async () => {
      try {
        await addDoc(collection(db, 'support_tickets'), {
          ...values,
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'open',
          createdAt: serverTimestamp(),
        });
        setSubmitted(true);
      } catch (error: any) {
        toast({
          title: 'حدث خطأ',
          description: 'لم نتمكن من إرسال تذكرتك. الرجاء المحاولة مرة أخرى.',
          variant: 'destructive',
        });
      }
    });
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  if (!restaurant) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-center p-4">
      <div>
        <h1 className="text-xl font-bold">عذراً, المطعم غير موجود</h1>
        <p className="text-muted-foreground mt-2">قد يكون الرابط الذي تتبعه غير صحيح.</p>
      </div>
    </div>
  );

  const primaryColor = restaurant.primaryColor || '#6366F1';
  const font = restaurant.fontFamily || 'Cairo';
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ fontFamily: font, backgroundColor: restaurant.secondaryColor || '#F3F4F6' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Avatar className="h-20 w-20 mx-auto border-4 shadow-md" style={{ borderColor: primaryColor }}>
            <AvatarImage src={restaurant.logo} />
            <AvatarFallback>{restaurant.name?.[0]}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mt-4">الدعم الفني لـ{restaurant.name}</h1>
        </div>
        
        <Card className="shadow-lg">
          {submitted ? (
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto"/>
              <h2 className="text-2xl font-bold">تم إرسال رسالتك بنجاح!</h2>
              <p className="text-muted-foreground">
                شكرًا لتواصلك معنا. لقد تم استلام رسالتك وسيتم مراجعتها من قبل إدارة المطعم.
              </p>
              <Button asChild>
                <Link href={`/hub/${username}`}>العودة إلى صفحة المطعم</Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                  إنشاء تذكرة دعم جديدة
                </CardTitle>
                <CardDescription>هل لديك شكوى أو استفسار؟ املأ النموذج وسيتم إرسال رسالتك مباشرةً إلى إدارة المطعم لمراجعتها داخليًا.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>الاسم</FormLabel><FormControl><Input {...field} placeholder="اسمك الكامل" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input {...field} type="email" placeholder="بريدك الإلكتروني" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="subject" render={({ field }) => (
                      <FormItem><FormLabel>الموضوع</FormLabel><FormControl><Input {...field} placeholder="عنوان المشكلة" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="message" render={({ field }) => (
                      <FormItem><FormLabel>الرسالة</FormLabel><FormControl><Textarea {...field} placeholder="اشرح مشكلتك بالتفصيل..." rows={5} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      إرسال التذكرة
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
