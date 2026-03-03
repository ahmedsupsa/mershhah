
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
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile } from '@/lib/types';
import { useLanguage } from '@/components/shared/LanguageContext';


const createFormSchema = (isRTL: boolean) => z.object({
  email: z.string().email({ 
    message: isRTL ? 'الرجاء إدخال إيميل صحيح.' : 'Please enter a valid email.' 
  }),
  password: z
    .string()
    .min(6, { 
      message: isRTL 
        ? 'كلمة المرور لازم تكون 6 أحرف عالأقل.' 
        : 'Password must be at least 6 characters.' 
    }),
});

const adminPages = [
  { href: "/admin/dashboard", permissionId: 'dashboard' },
  { href: "/admin/management", permissionId: 'management' },
  { href: "/admin/financials", permissionId: 'financials' },
  { href: "/admin/referrals", permissionId: 'referrals' },
  { href: "/admin/store-management", permissionId: 'store-management' },
  { href: "/admin/support", permissionId: 'support' },
  { href: "/admin/team", permissionId: 'team' },
  { href: "/admin/workflow", permissionId: 'workflow' },
];

const SUPER_ADMIN_EMAIL = 'ahmedsupsa@gmail.com';
const DEMO_EMAIL = 'demo@mershhah.com';


export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { locale } = useLanguage();
  const isRTL = locale === 'ar';
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const formSchema = createFormSchema(isRTL);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        const profileDocRef = doc(db, "profiles", user.uid);
        let profileDoc = await getDoc(profileDocRef);

        // إذا كان الحساب موجود في Firebase Auth لكن ما عنده ملف profile
        // نقوم بإنشاء ملف أساسي تلقائياً مع مطعم افتراضي لصاحب المشروع
        if (!profileDoc.exists()) {
            const isDemo = values.email === DEMO_EMAIL;
            const isSuperAdmin = values.email === SUPER_ADMIN_EMAIL;

            if (isDemo) {
                throw new Error("الحساب التجريبي غير موجود. يرجى الذهاب لصفحة التسجيل أولاً لإنشاء الحساب.");
            }

            const batch = writeBatch(db);
            let restaurantId: string | null = null;

            if (!isSuperAdmin) {
                const restaurantRef = doc(collection(db, "restaurants"));
                restaurantId = restaurantRef.id;

                const emailPrefix = values.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const randomSuffix = Math.floor(100 + Math.random() * 900);
                const uniqueUsername = `${emailPrefix || 'restaurant'}-${randomSuffix}`;

                batch.set(restaurantRef, {
                    id: restaurantId,
                    owner_id: user.uid,
                    name: "مشروعي",
                    username: uniqueUsername,
                    description: "مطعم أو مقهى جديد – يمكنك تعديل الاسم والوصف من لوحة التحكم.",
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
                    is_paid_plan: false,
                });

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
                    restaurantName: "مشروعي",
                    userId: user.uid,
                    timestamp: serverTimestamp(),
                });

                const activitySubRef = doc(collection(db, "activity"));
                batch.set(activitySubRef, {
                    type: "subscription_started",
                    restaurantId,
                    userId: user.uid,
                    planName: "الباقة المجانية",
                    restaurantName: "مشروعي",
                    timestamp: serverTimestamp(),
                });
            }

            const profileData: any = {
                id: user.uid,
                full_name: user.displayName || values.email.split('@')[0] || 'مستخدم جديد',
                email: values.email,
                phone_number: null,
                role: isSuperAdmin ? ('admin' as const) : ('owner' as const),
                account_status: 'active' as const,
                created_at: serverTimestamp(),
                restaurant_name: isSuperAdmin ? null : "مشروعي",
                restaurant_id: restaurantId,
            };

            if (isSuperAdmin) {
                profileData.admin_permissions = ['dashboard', 'management', 'financials', 'store-management', 'applications', 'announcements', 'support', 'team', 'workflow'];
            }

            batch.set(profileDocRef, profileData);
            await batch.commit();

            profileDoc = await getDoc(profileDocRef);
        }
        
        const userProfile = profileDoc.data() as Profile;

        if (userProfile.role === 'admin') {
            toast({ 
              title: isRTL ? 'أهلاً بك أيها المدير!' : 'Welcome, Admin!', 
              description: isRTL ? 'يجري توجيهك الآن...' : 'Redirecting you now...'
            });
            
            let redirectPath = '/admin/dashboard'; // Default path for super admin or fallback

            if (userProfile.email !== SUPER_ADMIN_EMAIL && userProfile.admin_permissions?.length) {
              const firstPermittedPage = adminPages.find(page => userProfile.admin_permissions!.includes(page.permissionId));
              if (firstPermittedPage) {
                redirectPath = firstPermittedPage.href;
              }
            }

            router.push(redirectPath);
        } else if (userProfile.role === 'owner') {
            toast({ 
              title: isRTL ? 'تم تسجيل الدخول بنجاح' : 'Login successful', 
              description: isRTL ? 'حيّاك الله! سيتم توجيهك الآن.' : 'Welcome! Redirecting you now.'
            });
            router.push('/owner/dashboard');
        } else {
            throw new Error(isRTL ? 'دور المستخدم غير معروف.' : 'Unknown user role.');
        }
        router.refresh();
    } catch (error: any) {
        let description = isRTL 
          ? 'الإيميل أو كلمة المرور غير صحيحة.' 
          : 'Invalid email or password.';
        if (error.message.includes('لم يتم العثور') || error.message.includes('الحساب التجريبي غير موجود')) {
            description = error.message;
        }

        toast({
            variant: 'destructive',
            title: isRTL ? 'خطأ في تسجيل الدخول' : 'Login Error',
            description,
        });
        await signOut(auth).catch(() => {});
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isRTL ? 'الإيميل' : 'Email'}</FormLabel>
              <FormControl>
                <Input type='email' placeholder='name@example.com' {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <div className='flex justify-between items-center'>
                <FormLabel>{isRTL ? 'كلمة المرور' : 'Password'}</FormLabel>
                <Link href='/forgot-password' className='text-sm text-primary hover:underline'>
                  {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </Link>
              </div>
              <FormControl>
                <div className='relative'>
                  <Input type={showPassword ? 'text' : 'password'} placeholder='••••••••' {...field} disabled={isLoading} />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className={`absolute top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground ${isRTL ? 'left-2' : 'right-2'}`}
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full !mt-6' disabled={isLoading}>
          {isLoading 
            ? (isRTL ? 'لحظات...' : 'Loading...') 
            : (isRTL ? 'تسجيل الدخول' : 'Login')}
        </Button>
        <div className='text-center text-sm text-muted-foreground pt-4'>
          {isRTL ? 'ما عندك حساب؟' : "Don't have an account?"}{' '}
          <Link href='/register' className='text-primary hover:underline font-semibold'>
            {isRTL ? 'سوّ حساب جديد' : 'Create account'}
          </Link>
        </div>
      </form>
    </Form>
  );
}
