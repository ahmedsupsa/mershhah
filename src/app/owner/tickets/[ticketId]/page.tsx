'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, updateDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

import PageHeader from '@/components/dashboard/PageHeader';
import { Button } from '@/components/ui/button';
import { ArrowRight, User as UserIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupportTicket } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

const statusStyles: any = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusText: any = {
  open: 'جديدة',
  contacted: 'تم التواصل',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const { user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;

    const ticketRef = doc(db, 'support_tickets', ticketId);
    const ticketUnsub = onSnapshot(ticketRef, (docSnap) => {
      if (docSnap.exists()) {
        setTicket({ id: docSnap.id, ...docSnap.data() } as SupportTicket);
      } else {
        setTicket(null);
      }
      setIsLoading(false);
    });

    return () => {
      ticketUnsub();
    };
  }, [ticketId]);

  
  const handleStatusChange = async (newStatus: 'open' | 'contacted' | 'resolved' | 'closed') => {
    try {
        await updateDoc(doc(db, 'support_tickets', ticketId), { status: newStatus });
        toast({ title: 'تم تحديث حالة التذكرة' });
    } catch(error: any) {
        toast({ title: 'خطأ', description: 'لم نتمكن من تحديث الحالة.', variant: 'destructive' });
    }
  };

  const loading = isLoading || isUserLoading;

  if (loading) {
    return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold">التذكرة غير موجودة</h2>
        <p className="text-muted-foreground">قد تكون قد حُذفت أو أن الرابط غير صحيح.</p>
      </div>
    );
  }

  // Security check
  if (user?.role !== 'admin' && user?.restaurantId !== ticket.restaurant_id) {
    return <div className="p-6 text-center text-destructive">غير مصرح لك بعرض هذه التذكرة.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={ticket.subject} description={`تذكرة من ${ticket.name}`}>
        <Button onClick={() => router.back()} variant="outline"><ArrowRight className="ml-2 h-4 w-4" /> العودة للتذاكر</Button>
      </PageHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <Card className="lg:col-span-1 sticky top-20">
            <CardHeader>
                <CardTitle>تفاصيل التذكرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>تغيير الحالة (إجراء داخلي)</Label>
                    <Select value={ticket.status} onValueChange={handleStatusChange as any}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="open">جديدة</SelectItem>
                            <SelectItem value="contacted">تم التواصل</SelectItem>
                            <SelectItem value="resolved">تم الحل</SelectItem>
                            <SelectItem value="closed">مغلقة</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="space-y-1">
                    <h4 className="text-sm font-medium flex items-center gap-2"><UserIcon className="h-4 w-4 text-muted-foreground" />العميل</h4>
                    <p className="text-sm text-foreground">{ticket.name}</p>
                    <p className="text-xs text-muted-foreground">{ticket.email}</p>
                 </div>
                 <div className="space-y-1">
                    <h4 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />تاريخ الإنشاء</h4>
                    <p className="text-sm text-foreground">{ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true, locale: ar }) : ''}</p>
                 </div>
            </CardContent>
        </Card>
        <div className="lg:col-span-3 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>محتوى التذكرة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-base leading-relaxed p-4 bg-muted rounded-md">{ticket.message}</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
