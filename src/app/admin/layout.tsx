'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { Header } from "@/components/shared/Header";
import React, { useEffect } from "react";
import { AdminAccountStatusChecker } from "@/components/auth/AdminAccountStatusChecker";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SessionTimeout } from "@/components/shared/SessionTimeout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
      <>
        <SessionTimeout />
        <SidebarProvider>
          <Sidebar side="right">
            <AdminSidebar />
          </Sidebar>
          <div className="min-h-screen w-full bg-muted/40">
            <SidebarInset>
              <Header />
              <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:grid-cols-1">
                <AdminAccountStatusChecker>
                  {children}
                </AdminAccountStatusChecker>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </>
  );
}
