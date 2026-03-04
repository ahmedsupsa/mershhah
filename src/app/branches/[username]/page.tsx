"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Phone, Clock, Info } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { StorageImage } from '@/components/shared/StorageImage';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicBranchesPage() {
  const params = useParams();
  const username = params.username as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubBranchesRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    const restQuery = query(
      collection(db, 'restaurants'),
      where('username', '==', username),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      restQuery,
      (restSnapshot) => {
        if (restSnapshot.empty) {
          setRestaurant(null);
          setBranches([]);
          setLoading(false);
          return;
        }

        const restDoc = restSnapshot.docs[0];
        const restData = { id: restDoc.id, ...restDoc.data() };
        setRestaurant(restData);

        const branchesQuery = query(
          collection(db, 'restaurants', restDoc.id, 'branches'),
          where('status', '==', 'active')
        );

        unsubBranchesRef.current = onSnapshot(branchesQuery, (snap) => {
          setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
          setLoading(false);
        });
      },
      () => setLoading(false)
    );

    return () => {
      unsubscribe();
      unsubBranchesRef.current?.();
    };
  }, [username]);

  const primaryColor = restaurant?.primaryColor || '#714dfa';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]" dir="rtl">
        <div className="h-24 w-full bg-gray-100 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-24 w-24 rounded-3xl mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-muted/30 text-center p-6" dir="rtl">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <Info className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-right mt-4">المطعم غير موجود!</h1>
        <Button asChild className="w-full max-w-xs mt-6 h-12 rounded-2xl font-bold">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#fafafa] pb-12 overflow-x-hidden" dir="rtl">
      {/* الهيدر */}
      <div className="bg-white border-b px-4 sm:px-6 py-6 sm:py-8 flex flex-col items-center text-center relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 rounded-2xl bg-muted/50 text-foreground hover:bg-muted"
          asChild
        >
          <Link href={`/hub/${username}`}>
            <ChevronRight className="h-6 w-6" />
          </Link>
        </Button>

        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl shadow-lg overflow-hidden">
          <StorageImage
            imagePath={restaurant.logo}
            alt={restaurant.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        </Avatar>
        <div className="space-y-1 mt-4">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground font-medium">الفروع</p>
        </div>
      </div>

      {/* قائمة الفروع */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-4">
        {branches.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="font-bold text-gray-700">لا توجد فروع متاحة حالياً</p>
            <p className="text-sm text-muted-foreground mt-1">تحقق لاحقاً أو تواصل مع المطعم</p>
            <Button variant="outline" className="mt-6 rounded-xl" asChild>
              <Link href={`/hub/${username}`}>العودة للرابط الرئيسي</Link>
            </Button>
          </div>
        ) : (
          branches.map((branch: any) => (
            <div
              key={branch.id}
              className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-4 sm:p-5 text-right"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div
                  className="w-12 h-12 flex items-center justify-center rounded-xl shrink-0 text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg text-gray-900">{branch.name}</p>
                  {(branch.city || branch.district) && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {[branch.city, branch.district].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {branch.address && (
                    <p className="text-sm text-muted-foreground mt-2">{branch.address}</p>
                  )}
                  {branch.opening_hours && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Clock className="h-4 w-4 shrink-0" />
                      {branch.opening_hours}
                    </p>
                  )}
                  {/* رقم التوصال وأيقونة الخريطة - تظهر دائماً */}
                  <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                    {branch.phone ? (
                      <a
                        href={`tel:${branch.phone}`}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-sm transition-colors"
                      >
                        <Phone className="h-4 w-4 shrink-0" />
                        {branch.phone}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-muted-foreground text-sm">
                        <Phone className="h-4 w-4 shrink-0" />
                        رقم التوصال غير متوفر
                      </span>
                    )}
                    {branch.google_maps_url ? (
                      <a
                        href={branch.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-sm transition-colors"
                      >
                        <MapPin className="h-4 w-4 shrink-0" />
                        فتح في الخرائط
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-muted-foreground text-sm">
                        <MapPin className="h-4 w-4 shrink-0" />
                        الموقع غير متوفر
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
