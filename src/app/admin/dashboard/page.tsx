'use client';

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import { Users, ShoppingBag, Loader2, Activity, CreditCard, UserPlus, ImagePlus, Sparkles } from "lucide-react";
import { collection, collectionGroup, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { errorEmitter } from "@/lib/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/firebase/errors";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

type Stats = {
  totalSubscriptionsCount: number;
  totalRestaurants: number;
  newSubscriptionsThisMonth: number;
};

type ActivityItem = {
  id: string;
  type: "restaurant_created" | "subscription_started" | "logo_added";
  restaurantId?: string | null;
  restaurantName?: string | null;
  planName?: string | null;
  userId?: string | null;
  timestamp: { toDate: () => Date } | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSubscriptionsCount: 0,
    totalRestaurants: 0,
    newSubscriptionsThisMonth: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 1. Total Restaurants
    const restaurantsCol = collection(db, "restaurants");
    const unsubRestaurants = onSnapshot(restaurantsCol, (snapshot) => {
        if (!isMounted) return;
        setStats(prev => ({ ...prev, totalRestaurants: snapshot.size }));
    }, (serverError) => {
        if (!isMounted) return;
        const permissionError = new FirestorePermissionError({
            path: 'restaurants',
            operation: 'list',
        } satisfies SecurityRuleContext, serverError);
        errorEmitter.emit('permission-error', permissionError);
    });
    
    // 2. Total Subscriptions & New Subscriptions This Month
    const subscriptionsQuery = collectionGroup(db, 'subscriptions');
    const unsubSubscriptions = onSnapshot(subscriptionsQuery, (snapshot) => {
        if (!isMounted) return;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let totalSubs = 0;
        let newSubs = 0;

        snapshot.docs.forEach(doc => {
            const subData = doc.data();
            totalSubs++;

            if (subData.start_date && typeof subData.start_date.toDate === 'function') {
                const startDate = subData.start_date.toDate();
                if (startDate >= startOfMonth) {
                    newSubs++;
                }
            }
        });

        setStats(prev => ({ 
            ...prev, 
            totalSubscriptionsCount: totalSubs,
            newSubscriptionsThisMonth: newSubs
        }));
        setIsLoading(false);
    }, (serverError) => {
        if (!isMounted) return;
        const permissionError = new FirestorePermissionError({
            path: 'subscriptions (collectionGroup)',
            operation: 'list',
        } satisfies SecurityRuleContext, serverError);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoading(false);
    });

    // 3. Activity feed
    const activityCol = collection(db, "activity");
    const activityQuery = query(activityCol, orderBy("timestamp", "desc"), limit(50));
    const unsubActivity = onSnapshot(activityQuery, (snapshot) => {
        if (!isMounted) return;
        const items: ActivityItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            type: d.type as ActivityItem["type"],
            restaurantId: d.restaurantId ?? null,
            restaurantName: d.restaurantName ?? null,
            planName: d.planName ?? null,
            userId: d.userId ?? null,
            timestamp: d.timestamp && typeof d.timestamp.toDate === "function" ? d.timestamp : null,
          };
        });
        setActivities(items);
    }, (serverError) => {
        if (!isMounted) return;
        const permissionError = new FirestorePermissionError({
            path: "activity",
            operation: "list",
        } satisfies SecurityRuleContext, serverError);
        errorEmitter.emit("permission-error", permissionError);
    });

    return () => {
        isMounted = false;
        unsubRestaurants();
        unsubSubscriptions();
        unsubActivity();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-8 text-right" dir="rtl">
        <div>
            <h1 className="text-2xl font-bold">لوحة المعلومات (مدير)</h1>
            <p className="text-muted-foreground">جاري جلب البيانات الفعلية من النظام...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-right">النشاط الأخير</h2>
            <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-8 text-right" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">لوحة المعلومات (مدير)</h1>
        <p className="text-muted-foreground">
          نظرة عامة دقيقة على أداء ونمو المنصة.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <StatCard
          title="إجمالي المطاعم"
          value={stats.totalRestaurants.toString()}
          icon={ShoppingBag}
          change="كل المطاعم المنشأة فعلياً"
        />
        <StatCard
          title="إجمالي المشتركين"
          value={stats.totalSubscriptionsCount.toString()}
          icon={Users}
          change="إجمالي سجلات الاشتراك"
        />
        <StatCard
          title="الاشتراكات الجديدة"
          value={stats.newSubscriptionsThisMonth.toString()}
          icon={CreditCard}
          change="التي بدأت خلال هذا الشهر"
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4 text-right">النشاط الأخير</h2>
        <Card>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="p-4 bg-primary/5 rounded-full mb-4">
                  <Activity className="h-10 w-10 text-primary opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-foreground">لا يوجد نشاط مسجل حالياً</h3>
                <p className="max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                  يتم الآن تتبع الأنشطة اللحظية للمشتركين. ستظهر سجلات التفعيل والتحديثات المهمة هنا فور حدوثها.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((item) => {
                  const ts = item.timestamp?.toDate?.() ?? new Date(0);
                  const label =
                    item.type === "restaurant_created"
                      ? "تم إنشاء حساب"
                      : item.type === "subscription_started"
                        ? "تم تفعيل اشتراك"
                        : item.type === "logo_added"
                          ? "تم إضافة شعار"
                          : "نشاط";
                  const Icon =
                    item.type === "restaurant_created"
                      ? UserPlus
                      : item.type === "subscription_started"
                        ? Sparkles
                        : ImagePlus;
                  const detail =
                    item.type === "restaurant_created" || item.type === "logo_added"
                      ? item.restaurantName || "—"
                      : item.type === "subscription_started"
                        ? [item.planName, item.restaurantName].filter(Boolean).join(" · ") || "—"
                        : "—";
                  return (
                    <li key={item.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-sm text-muted-foreground truncate">{detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0" title={ts.toLocaleString("ar-SA")}>
                        {formatDistanceToNow(ts, { addSuffix: true, locale: ar })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
