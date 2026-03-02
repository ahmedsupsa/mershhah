
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shared/Logo";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md">
        <div className="w-full space-y-6">
            <div className="text-center space-y-2">
                <div className="inline-block">
                  <Logo />
                </div>
                <h1 className="font-headline text-2xl font-bold">تسجيل الدخول</h1>
                <p className="text-muted-foreground">
                  حيّاك! أدخل بياناتك عشان توصل للوحة التحكم.
                </p>
            </div>
            <div className="bg-card p-6 sm:p-8 rounded-2xl border shadow-sm">
              <LoginForm />
            </div>
        </div>
      </div>
    </div>
  );
}
