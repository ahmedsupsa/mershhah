'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import { EditBranchDialog } from '@/components/dashboard/EditBranchDialog';
import { BranchesTable } from '@/components/dashboard/BranchesTable';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Branch } from '@/lib/types';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

export default function BranchesPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user?.restaurantId) {
      setIsFetchingData(true);
      const branchesCollection = collection(db, 'restaurants', user.restaurantId, 'branches');
      
      const unsubscribe = onSnapshot(branchesCollection, (querySnapshot) => {
          const fetchedBranches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
          setBranches(fetchedBranches || []);
          setIsFetchingData(false);
      }, async (serverError) => {
          // Implementing the specialized error-handling architecture
          const permissionError = new FirestorePermissionError({
            path: branchesCollection.path,
            operation: 'list',
          } satisfies SecurityRuleContext, serverError);
          
          errorEmitter.emit('permission-error', permissionError);
          setIsFetchingData(false);
      });

      return () => unsubscribe();

    } else if (!isUserLoading) {
      setIsFetchingData(false);
    }
  }, [isUserLoading, user, toast]);

  const loadingData = isFetchingData || isUserLoading;
  
  if (loadingData) {
    return (
      <div className="space-y-8" dir="rtl">
        <PageHeader title="إدارة الفروع" description="أضف وعدّل فروع مطعمك من هنا." >
             <Skeleton className="h-10 w-32" />
        </PageHeader>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    )
  }

  return (
    <div className="space-y-8" dir="rtl">
      <PageHeader
        title="إدارة الفروع"
        description="أضف وعدّل فروع مطعمك من هنا."
      >
        {user?.restaurantId && (
          <EditBranchDialog restaurantId={user.restaurantId} onSave={() => {}}>
            <Button disabled={loadingData}>
              <PlusCircle className="ml-2 h-4 w-4" />
              إضافة فرع جديد
            </Button>
          </EditBranchDialog>
        )}
      </PageHeader>

      <BranchesTable 
        branches={branches} 
        restaurantId={user?.restaurantId || ''} 
        onActionCompletion={() => {}}
      />
    </div>
  );
}
