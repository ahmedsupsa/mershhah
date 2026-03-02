'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { OfferCard } from "@/components/dashboard/OfferCard";
import { Button } from "@/components/ui/button";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditOfferDialog } from '@/components/dashboard/EditOfferDialog';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';


export default function OffersPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [offerToDelete, setOfferToDelete] = useState<any | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const { toast } = useToast();
  
  const [offers, setOffers] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user?.restaurantId) {
      setIsFetchingData(true);
      const restId = user.restaurantId;
      setRestaurantId(restId);

      const offersCollection = collection(db, 'restaurants', restId, 'offers');
      const unsubscribe = onSnapshot(offersCollection, (querySnapshot) => {
        const fetchedOffers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOffers(fetchedOffers || []);
        setIsFetchingData(false);
      }, (error: any) => {
        toast({ variant: "destructive", title: "خطأ في جلب البيانات", description: error.message });
        setIsFetchingData(false);
      });
      return () => unsubscribe();
    } else if (!isUserLoading) {
      setIsFetchingData(false);
    }
  }, [isUserLoading, user, toast]);

  const loadingData = isFetchingData || isUserLoading;

  const handleDelete = () => {
    if (!offerToDelete || !restaurantId) return;
    startDelete(async () => {
      const offerRef = doc(db, 'restaurants', restaurantId, 'offers', offerToDelete.id);
      try {
        await deleteDoc(offerRef);
        toast({ title: "تم حذف العرض بنجاح" });
        // No need to fetch, onSnapshot will update the UI.
      } catch(error: any) {
        toast({ variant: "destructive", title: "خطأ في الحذف", description: error.message });
      }
      setOfferToDelete(null);
    });
  };

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="إدارة العروض"
          description="سوّ عروض ترويجية عشان تجذب زباين أكثر."
        >
          <EditOfferDialog restaurantId={restaurantId!} userId={user?.uid} onSave={() => { /* onSnapshot handles updates */ }}>
            <Button disabled={loadingData || !restaurantId}>
              <PlusCircle className="ml-2 h-4 w-4" />
              سوّ عرض جديد
            </Button>
          </EditOfferDialog>
        </PageHeader>
        
        {loadingData && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
             <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
             <Card><CardContent className="h-64 animate-pulse bg-muted rounded-lg"></CardContent></Card>
          </div>
        )}

        {!loadingData && offers.length === 0 && (
           <Card>
              <CardContent className="p-6">
                   <div className="flex flex-col items-center justify-center gap-2 h-48 text-center">
                      <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                      <p className="font-semibold">لا توجد عروض حاليًا</p>
                      <p className="text-sm text-muted-foreground">عند إضافة عروض جديدة، ستظهر هنا.</p>
                  </div>
              </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!loadingData && restaurantId && offers.map(offer => (
              <OfferCard 
                key={offer.id} 
                offer={offer} 
                onDelete={() => setOfferToDelete(offer)}
                restaurantId={restaurantId}
                onActionCompletion={() => { /* onSnapshot handles updates */ }}
              />
          ))}
        </div>
      </div>

       <AlertDialog open={!!offerToDelete} onOpenChange={(open) => !open && setOfferToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف عرض "{offerToDelete?.title}" نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
