'use client';

import Analytics from "@/components/dashboard/Analytics";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementBanner } from "@/components/dashboard/AnnouncementBanner";

export default function OwnerDashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleRefresh = () => {
    startTransition(() => {
        setRefreshKey(prevKey => prevKey + 1);
        toast({ title: "جاري تحديث البيانات..." });
    });
  }

  return (
    <div className="space-y-8" dir="rtl">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة سريعة على أداء مشروعك."
      >
        <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`ml-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            تحديث
        </Button>
      </PageHeader>
      <AnnouncementBanner />
      <Analytics key={refreshKey} />
    </div>
  );
}
