'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, RefreshCw, MessageSquare, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useUser';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { SupportTicket } from '@/lib/types';

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

export default function OwnerTicketsPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, startRefresh] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && user?.restaurantId) {
        setIsLoading(true);
        const q = query(collection(db, "support_tickets"), where("restaurant_id", "==", user.restaurantId));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedTickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportTicket));
            fetchedTickets.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setTickets(fetchedTickets);
            setIsLoading(false);
        }, (error: any) => {
            toast({ variant: "destructive", title: "خطأ في جلب التذاكر", description: error.message });
            setIsLoading(false);
        });

        return () => unsubscribe();
    } else if (!isUserLoading) {
        setIsLoading(false);
    }
  }, [user, isUserLoading, toast]);
  
  const handleRefresh = () => {
    startRefresh(() => {
        toast({ title: 'البيانات يتم تحديثها تلقائياً' });
    });
  }

  const isLoadingData = isLoading || isUserLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title="تذاكر دعم العملاء"
        description="هنا تجد استفسارات وشكاوى عملائك وتقوم بمراجعتها داخليًا."
      >
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoadingData}>
            <RefreshCw className={`ml-2 h-4 w-4 ${isRefreshing || isLoadingData ? 'animate-spin' : ''}`} />
            تحديث
        </Button>
      </PageHeader>
      
      {isLoadingData ? (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             <Skeleton className="h-32" />
             <Skeleton className="h-32" />
             <Skeleton className="h-32" />
             <Skeleton className="h-32" />
         </div>
      ) : tickets.length === 0 ? (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center gap-2 h-48 text-center">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                    <p className="font-semibold">لا توجد تذاكر لديك</p>
                    <p className="text-sm text-muted-foreground">عندما ينشئ عملاؤك تذاكر دعم، ستظهر هنا.</p>
                </div>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={statusStyles[ticket.status] || ''}>
                    {statusText[ticket.status] || ticket.status}
                  </Badge>
                   <p className="text-xs text-muted-foreground font-mono">{ticket.id.substring(0, 8)}</p>
                </div>
                <CardTitle className="pt-2">{ticket.subject}</CardTitle>
                
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4"/>
                    <span>{ticket.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4"/>
                    <span>{ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt.seconds * 1000), { addSuffix: true, locale: ar }) : ''}</span>
                </div>
                 <p className="text-sm text-foreground pt-2 line-clamp-2">{ticket.message}</p>
              </CardContent>
              <CardFooter>
                 <Button asChild className="w-full">
                  <Link href={`/owner/tickets/${ticket.id}`}> 
                    عرض التفاصيل وتغيير الحالة <MessageSquare className="mr-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
