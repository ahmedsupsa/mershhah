
import { RegisterForm } from "@/components/auth/RegisterForm";
import { Logo } from "@/components/shared/Logo";

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="w-full space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-block">
                  <Logo />
                </div>
                <h1 className="font-headline text-2xl font-bold">أنشئ حسابك الآن</h1>
                <p className="text-muted-foreground">
                  سجّل بياناتك للانضمام إلى منصتنا والبدء في إدارة نشاطك بذكاء.
                </p>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-2xl border shadow-sm">
              <RegisterForm />
            </div>
        </div>
      </div>
    </div>
  );
}
