
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
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile } from '@/lib/types';


const formSchema = z.object({
  email: z.string().email({ message: 'الرجاء إدخال إيميل صحيح.' }),
  password: z
    .string()
    .min(6, { message: 'كلمة المرور لازم تكون 6 أحرف عالأقل.' }),
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        const profileDoc = await getDoc(profileDocRef);

        if (!profileDoc.exists()) {
            if (values.email === DEMO_EMAIL) {
                throw new Error("الحساب التجريبي غير موجود. يرجى الذهاب لصفحة التسجيل أولاً لإنشاء الحساب.");
            }
            throw new Error("لم يتم العثور على ملف شخصي مطابق. الرجاء التواصل مع الدعم.");
        }
        
        const userProfile = profileDoc.data() as Profile;

        if (userProfile.role === 'admin') {
            toast({ title: 'أهلاً بك أيها المدير!', description: 'يجري توجيهك الآن...' });
            
            let redirectPath = '/admin/dashboard'; // Default path for super admin or fallback

            if (userProfile.email !== SUPER_ADMIN_EMAIL && userProfile.admin_permissions?.length) {
              const firstPermittedPage = adminPages.find(page => userProfile.admin_permissions!.includes(page.permissionId));
              if (firstPermittedPage) {
                redirectPath = firstPermittedPage.href;
              }
            }

            router.push(redirectPath);
        } else if (userProfile.role === 'owner') {
            toast({ title: 'تم تسجيل الدخول بنجاح', description: 'حيّاك الله! سيتم توجيهك الآن.' });
            router.push('/owner/dashboard');
        } else {
            throw new Error('دور المستخدم غير معروف.');
        }
        router.refresh();
    } catch (error: any) {
        let description = 'الإيميل أو كلمة المرور غير صحيحة.';
        if (error.message.includes('لم يتم العثور') || error.message.includes('الحساب التجريبي غير موجود')) {
            description = error.message;
        }

        toast({
            variant: 'destructive',
            title: 'خطأ في تسجيل الدخول',
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
              <FormLabel>الإيميل</FormLabel>
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
                <FormLabel>كلمة المرور</FormLabel>
                <Link href='/forgot-password' className='text-sm text-primary hover:underline'>
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <FormControl>
                <div className='relative'>
                  <Input type={showPassword ? 'text' : 'password'} placeholder='••••••••' {...field} disabled={isLoading} />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground'
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
          {isLoading ? 'لحظات...' : 'تسجيل الدخول'}
        </Button>
        <div className='text-center text-sm text-muted-foreground pt-4'>
          ما عندك حساب؟{' '}
          <Link href='/register' className='text-primary hover:underline font-semibold'>
            سوّ حساب جديد
          </Link>
        </div>
      </form>
    </Form>
  );
}
