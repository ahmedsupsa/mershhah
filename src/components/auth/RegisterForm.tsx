
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const ADMIN_EMAIL = 'ahmedsupsa@gmail.com';
const DEMO_EMAIL = 'demo@mershhah.com';
const DEMO_PASSWORD = 'demo123';

const allAdminPermissions = [
  'dashboard',
  'management',
  'financials',
  'store-management',
  'applications',
  'announcements',
  'support',
  'team',
  'workflow',
];

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'الاسم الكامل لازم يكون حرفين عالأقل.' }),
  restaurantName: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email({ message: 'الرجاء إدخال إيميل صحيح.' }),
  password: z.string().min(6, { message: 'كلمة المرور لازم تكون 6 أحرف عالأقل.' }),
}).superRefine((data, ctx) => {
    if (data.email !== ADMIN_EMAIL) {
        if (!data.restaurantName || data.restaurantName.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "اسم مشروعك التجاري لازم يكون حرفين عالأقل.",
                path: ['restaurantName'],
            });
        }
        if (!data.phoneNumber || data.phoneNumber.length < 9) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "الرجاء إدخال رقم جوال صحيح.",
                path: ['phoneNumber'],
            });
        }
    }
});


export function RegisterForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      restaurantName: '',
      phoneNumber: '',
      email: '',
      password: '',
    },
  });

  const emailValue = form.watch('email');
  const isDemoFlow = emailValue === DEMO_EMAIL;
  const isAdminFlow = emailValue === ADMIN_EMAIL;

  useEffect(() => {
    if (isDemoFlow) {
      form.setValue('password', DEMO_PASSWORD);
    } else {
      if (form.getValues('password') === DEMO_PASSWORD) {
        form.setValue('password', '');
      }
    }
  }, [isDemoFlow, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;
        
        const isDemoUser = values.email === DEMO_EMAIL;
        const isAdmin = values.email === ADMIN_EMAIL;
        let restaurantId = null;

        const batch = writeBatch(db);

        if (!isAdmin) {
            const restaurantRef = doc(collection(db, "restaurants"));
            restaurantId = restaurantRef.id;

            const emailPrefix = values.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const randomSuffix = Math.floor(100 + Math.random() * 900);
            const uniqueUsername = isDemoUser ? 'democafe' : `${emailPrefix}-${randomSuffix}`;
            
            const restaurantData = {
                id: restaurantId,
                owner_id: user.uid,
                name: values.restaurantName,
                username: uniqueUsername,
                description: "مقهى ومطعم يقدم أشهى المأكولات والمشروبات في أجواء عصرية ومريحة. حياكم!",
                logo: null,
                primaryColor: '#6366F1',
                secondaryColor: '#F3F4F6',
                buttonTextColor: '#FFFFFF',
                borderRadius: 12,
                fontFamily: 'Cairo',
                socialLinks: null,
                deliveryApps: null,
                aiConfig: null,
                created_at: serverTimestamp(),
                is_paid_plan: false, // Default to free for new owners
            };
            batch.set(restaurantRef, restaurantData);
        }

        const profileRef = doc(db, "profiles", user.uid);
        const profileData: any = {
            id: user.uid,
            full_name: values.fullName,
            email: values.email,
            phone_number: values.phoneNumber || null,
            role: isAdmin ? 'admin' as const : 'owner' as const,
            account_status: 'active' as const,
            created_at: serverTimestamp(),
            restaurant_name: isAdmin ? null : values.restaurantName,
            restaurant_id: restaurantId,
        };

        if (isAdmin) {
          profileData.admin_permissions = allAdminPermissions;
        }

        batch.set(profileRef, profileData);
        
        if (!isAdmin) {
            const subscriptionRef = doc(collection(db, "profiles", user.uid, "subscriptions"));
            const startDate = new Date();
            const endDate = new Date();
            endDate.setFullYear(startDate.getFullYear() + 100);

            batch.set(subscriptionRef, {
                id: subscriptionRef.id,
                profile_id: user.uid,
                plan_id: 'free',
                plan_name: 'الباقة المجانية',
                status: 'active',
                start_date: startDate,
                end_date: endDate,
            });

            const activityRestaurantRef = doc(collection(db, "activity"));
            batch.set(activityRestaurantRef, {
                type: "restaurant_created",
                restaurantId,
                restaurantName: values.restaurantName,
                userId: user.uid,
                timestamp: serverTimestamp(),
            });
            const activitySubRef = doc(collection(db, "activity"));
            batch.set(activitySubRef, {
                type: "subscription_started",
                restaurantId,
                userId: user.uid,
                planName: "الباقة المجانية",
                restaurantName: values.restaurantName,
                timestamp: serverTimestamp(),
            });
        }
        
        if (isDemoUser && restaurantId) {
            const mockMenuItems = [
              { name: 'برجر لحم كلاسيك', description: 'قطعة لحم بقري مشوي مع جبنة شيدر، خس، طماطم، وبصل في خبز بريوش طري.', category: 'برجر', sizes: [{ name: 'عادي', price: 28, cost: 12 }], status: 'available', display_tags: 'best_seller' },
              { name: 'برجر دجاج كرسبي', description: 'صدر دجاج مقلي مقرمش مع صوص خاص، مخلل، وخس.', category: 'برجر', sizes: [{ name: 'عادي', price: 26, cost: 10 }], status: 'available', display_tags: 'none' },
              { name: 'بطاطس مقلية', description: 'بطاطس ذهبية مقرمشة مملحة بشكل مثالي.', category: 'مقبلات', sizes: [{ name: 'عادي', price: 9, cost: 3 }], status: 'available', display_tags: 'none' },
              { name: 'حلقات البصل', description: 'حلقات بصل مقلية مقرمشة تقدم مع اختيارك من الصوصات.', category: 'مقبلات', sizes: [{ name: 'عادي', price: 12, cost: 4 }], status: 'available', display_tags: 'new' },
              { name: 'مشروب غازي', description: 'كوكاكولا، سبرايت، أو فانتا.', category: 'مشروبات', sizes: [{ name: 'عادي', price: 5, cost: 1 }], status: 'available', display_tags: 'none' },
              { name: 'ميلك شيك فانيلا', description: 'ميلك شيك كريمي بنكهة الفانيلا الغنية.', category: 'حلويات', sizes: [{ name: 'عادي', price: 18, cost: 7 }], status: 'unavailable', display_tags: 'none' },
            ];

            const menuItemsCollection = collection(db, 'restaurants', restaurantId, 'menu_items');
            
            mockMenuItems.forEach((item, index) => {
                const newItemRef = doc(menuItemsCollection);
                batch.set(newItemRef, {
                    ...item,
                    restaurant_id: restaurantId,
                    position: index,
                    createdAt: serverTimestamp(),
                });
            });
        }
        
        await batch.commit();

        toast({
            title: "تم التسجيل بنجاح!",
            description: isAdmin ? "أهلاً بك أيها المدير." : "أهلاً بك! تم تفعيل الباقة المجانية لحسابك.",
        });
        
        if (isAdmin) {
             router.push('/admin/dashboard');
        } else {
            router.push('/owner/dashboard');
        }
        router.refresh();

    } catch (error: any) {
      let description = "حدث خطأ غير متوقع.";
      if (error.code === 'auth/email-already-in-use') {
        description = 'هذا البريد الإلكتروني مسجل مسبقًا.';
      }
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الحساب",
        description: description,
      });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
        <FormField
          control={form.control}
          name='fullName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>الاسم الكامل</FormLabel>
              <FormControl>
                <Input
                  placeholder='مثال: خالد الأحمد'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>الإيميل</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='name@example.com'
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isAdminFlow && (
            <>
                <FormField
                control={form.control}
                name='restaurantName'
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>اسم مشروعك التجاري (مطعم/مقهى)</FormLabel>
                    <FormControl>
                        <Input
                        placeholder='مشروعي'
                        {...field}
                        disabled={isLoading}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name='phoneNumber'
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>رقم الجوال</FormLabel>
                    <FormControl>
                        <Input
                        placeholder='05xxxxxxxx'
                        {...field}
                        disabled={isLoading}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </>
        )}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>كلمة المرور</FormLabel>
              <FormControl>
                <div className='relative'>
                    <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder='••••••••'
                        {...field}
                        disabled={isLoading || isDemoFlow}
                    />
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground'
                        onClick={() => setShowPassword(prev => !prev)}
                    >
                        {showPassword ? <EyeOff /> : <Eye />}
                        <span className='sr-only'>{showPassword ? 'إخفاء' : 'إظهار'} كلمة المرور</span>
                    </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full !mt-6' disabled={isLoading}>
          {isLoading ? 'لحظات...' : 'إنشاء حساب'}
        </Button>
        <div className='text-center text-sm text-muted-foreground pt-4'>
          عندك حساب?{" "}
          <Link href='/login' className='text-primary hover:underline font-semibold'>
            سجل دخول
          </Link>
        </div>
      </form>
    </Form>
  );
}
