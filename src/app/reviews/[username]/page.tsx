
"use client";

import { useEffect, useState, useTransition, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight, Star, Loader2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, orderBy, runTransaction, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { Restaurant } from '@/lib/types';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: { seconds: number; nanoseconds: number; } | null;
  is_visible?: boolean;
}

const StarRating = ({ rating, size = 'md' }: { rating: number, size?: 'sm' | 'md' }) => {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn(starSize, rating >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300')} />
      ))}
    </div>
  );
};

const RatingDialog = ({ open, onOpenChange, onSubmit, isSubmitting, restaurantName }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (rating: number, comment: string) => void; isSubmitting: boolean; restaurantName: string; }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = () => { if (rating > 0) { onSubmit(rating, comment); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>تقييم {restaurantName}</DialogTitle><DialogDescription>شاركنا رأيك لمساعدتنا على التحسن.</DialogDescription></DialogHeader>
        <div className="py-4">
          <div className="flex justify-center mb-4" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => ( <Star key={star} className="h-8 w-8 cursor-pointer transition-colors" fill={star <= (hoverRating || rating) ? '#f59e0b' : 'none'} stroke={star <= (hoverRating || rating) ? '#f59e0b' : 'currentColor'} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} /> ))}
          </div>
          <Textarea placeholder="اترك تعليقك هنا (اختياري)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button><Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>{isSubmitting ? 'جاري الإرسال...' : 'إرسال التقييم'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function PublicReviewsPage() {
    const params = useParams();
    const router = useRouter();
    const username = params.username as string;
    const { toast } = useToast();

    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRatingDialogOpen, setRatingDialogOpen] = useState(false);
    const [isSubmittingRating, startRatingSubmission] = useTransition();
    
    useEffect(() => {
        if (!username) return;
        setLoading(true);

        const restQuery = query(collection(db, "restaurants"), where("username", "==", username), limit(1));
        const restUnsub = onSnapshot(restQuery, (restSnapshot) => {
            if (restSnapshot.empty) {
                setRestaurant(null);
                setLoading(false);
                return;
            }
            const restDoc = restSnapshot.docs[0];
            const restData = { id: restDoc.id, ...restDoc.data() } as Restaurant;
            setRestaurant(restData);

            const reviewsQuery = query(collection(db, 'restaurants', restDoc.id, 'reviews'), orderBy('createdAt', 'desc'));
            const reviewsUnsub = onSnapshot(reviewsQuery, (reviewsSnap) => {
                const fetchedReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                
                // Filter and sort client-side
                const visibleReviews = fetchedReviews.filter(review => review.is_visible !== false);
                setReviews(visibleReviews);
                setLoading(false);
            });
            return reviewsUnsub;
        });

        return () => restUnsub();
    }, [username]);

    const handleRateSubmit = async (rating: number, comment: string) => {
        if (!restaurant) return;
        startRatingSubmission(async () => {
          try {
            await runTransaction(db, async (transaction) => {
              const restaurantRef = doc(db, 'restaurants', restaurant.id);
              const newReviewRef = doc(collection(restaurantRef, 'reviews'));
              const restDoc = await transaction.get(restaurantRef);
              if (!restDoc.exists()) { throw "Restaurant not found"; }
              const restData = restDoc.data();
              transaction.set(newReviewRef, { rating, comment, createdAt: serverTimestamp(), restaurant_id: restaurant.id, is_visible: true });
              const newReviewCount = (restData.reviewCount || 0) + 1;
              const newTotalScore = (restData.totalRatingScore || 0) + rating;
              transaction.update(restaurantRef, { reviewCount: newReviewCount, totalRatingScore: newTotalScore, rating: newTotalScore / newReviewCount });
            });
            toast({ title: "شكراً لتقييمك!", description: "نحن نقدر رأيك." });
            setRatingDialogOpen(false);
          } catch (error) {
            console.error("Failed to submit rating:", error);
            toast({ title: "خطأ", description: "فشل إرسال التقييم.", variant: "destructive" });
          }
        });
    };
    
    const { averageRating, distribution } = useMemo(() => {
        if (reviews.length === 0) return { averageRating: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
        const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        const avg = totalRating / reviews.length;
        const dist = reviews.reduce((acc, review) => {
            const rating = Math.floor(review.rating || 0);
            if (rating >= 1 && rating <= 5) acc[rating as keyof typeof acc]++;
            return acc;
        }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
        return { averageRating: avg, distribution: dist };
    }, [reviews]);
    
    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    if (!restaurant) return <div className="h-screen flex items-center justify-center">المطعم غير موجود.</div>;
    
    const primaryColor = restaurant.primaryColor || '#6366F1';
    
    return (
        <>
            <div className="flex flex-col min-h-screen bg-gray-50 pb-10" style={{ fontFamily: 'Cairo, sans-serif' }}>
                <header className="p-6 bg-white border-b sticky top-0 z-10 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronRight className="h-6 w-6" /></Button>
                    <h1 className="text-xl font-black">آراء العملاء</h1>
                </header>
                <div className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
                    <Card>
                        <CardHeader><CardTitle>ملخص التقييمات</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
                                <div className="text-center sm:text-right">
                                    <span className="text-5xl font-black">{averageRating.toFixed(1)}</span>
                                    <span className="text-muted-foreground">/ 5</span>
                                    <div className="flex justify-center sm:justify-start mt-1"><StarRating rating={averageRating} /></div>
                                    <p className="text-xs text-muted-foreground mt-1">بناءً على {reviews.length} تقييم</p>
                                </div>
                                <div className="w-full sm:w-1/2">
                                    {[5, 4, 3, 2, 1].map(star => (
                                      <div key={star} className="flex items-center gap-2">
                                        <span className="text-xs w-8 text-center">{star} <Star className="h-3 w-3 inline-block" /></span>
                                        <Progress value={reviews.length > 0 ? (distribution[star as keyof typeof distribution] / reviews.length) * 100 : 0} className="h-2" />
                                      </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter><Button onClick={() => setRatingDialogOpen(true)} className="w-full sm:w-auto" style={{ backgroundColor: primaryColor }}><Star className="ml-2 h-4 w-4" /> أضف تقييمك</Button></CardFooter>
                    </Card>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold">أحدث التعليقات</h3>
                        {reviews.filter(r => r.comment).map(review => (
                            <Card key={review.id} className="bg-white">
                                <CardContent className="p-4 flex gap-3">
                                    <Avatar className="mt-1"><AvatarFallback>U</AvatarFallback></Avatar>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <StarRating rating={review.rating} size="sm" />
                                            <p className="text-xs text-muted-foreground">{review.createdAt?.seconds ? formatDistanceToNow(new Date(review.createdAt.seconds * 1000), { addSuffix: true, locale: ar }) : ''}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {reviews.filter(r => r.comment).length === 0 && (<div className="text-center text-muted-foreground py-10"><p>لا توجد تعليقات مكتوبة بعد.</p></div>)}
                    </div>
                </div>
            </div>
            <RatingDialog open={isRatingDialogOpen} onOpenChange={setRatingDialogOpen} onSubmit={handleRateSubmit} isSubmitting={isSubmittingRating} restaurantName={restaurant.name} />
        </>
    );
}
