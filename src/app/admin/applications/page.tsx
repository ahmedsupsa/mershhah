'use client';

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Application } from "@/lib/types";
import { ApplicationsTable } from "@/components/admin/applications/ApplicationsTable";
import { EditApplicationDialog } from "@/components/admin/applications/EditApplicationDialog";

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const q = collection(db, "applications");

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedApps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
            setApplications(fetchedApps);
            setIsLoading(false);
        }, (error: any) => {
            toast({ variant: "destructive", title: "خطأ في جلب التطبيقات", description: error.message });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const handleActionComplete = () => {
        // onSnapshot will handle the UI update, this is just a placeholder if needed
    };

    if (isLoading) {
        return (
            <div className="space-y-8">
                <PageHeader title="إدارة التطبيقات" description="إدارة التطبيقات الخارجية التي يمكن للمطاعم ربطها.">
                    <Skeleton className="h-10 w-36" />
                </PageHeader>
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="إدارة التطبيقات"
                description="إدارة التطبيقات الخارجية التي يمكن للمطاعم ربطها (توصيل, ولاء, دفع)."
            >
                <EditApplicationDialog onSave={handleActionComplete}>
                    <Button>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة تطبيق جديد
                    </Button>
                </EditApplicationDialog>
            </PageHeader>
            <ApplicationsTable applications={applications} onActionComplete={handleActionComplete} />
        </div>
    );
}
