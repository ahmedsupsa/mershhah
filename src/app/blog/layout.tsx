'use client';

import { useState, useEffect } from 'react';
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PublicFooter } from "@/components/shared/PublicFooter";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="bg-white text-foreground min-h-screen overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <header className="py-6 flex justify-between items-center border-b">
          <Logo />
          <Button asChild variant="outline">
            <Link href="/">
                <ArrowLeft className="ml-2 h-4 w-4" />
                العودة للرئيسية
            </Link>
          </Button>
        </header>
        <main className="py-8 md:py-12">
            {children}
        </main>
      </div>
      <PublicFooter />
    </div>
  );
}
