'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { EditBranchDialog } from '@/components/dashboard/EditBranchDialog';
import { BranchesList } from '@/components/dashboard/BranchesList';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Branch } from '@/lib/types';

export default function BranchesPage() {
  const { user, isLoading: userLoading } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const restaurantId = user?.restaurantId ?? '';

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = collection(db, 'restaurants', restaurantId, 'branches');
    const unsub = onSnapshot(ref, (snap) => {
      setBranches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Branch)));
      setLoading(false);
    });
    return () => unsub();
  }, [restaurantId]);

  if (userLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة الفروع"
        description="أضف وعُدّل فروع مطعمك من قائمة واحدة."
      >
        {restaurantId && (
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="ml-2 h-4 w-4" />
            إضافة فرع
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <BranchesList
          branches={branches}
          restaurantId={restaurantId}
          onChanged={() => {}}
        />
      )}

      {restaurantId && (
        <EditBranchDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          restaurantId={restaurantId}
          onSaved={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
