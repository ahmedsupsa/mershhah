
'use client';

import { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Profile } from "@/lib/types";
import { AdminUsersTable } from "@/components/admin/team/AdminUsersTable";
import { AddAdminDialog } from "@/components/admin/team/AddAdminDialog";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default function TeamManagementPage() {
    const [admins, setAdmins] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, "profiles"), where("role", "==", "admin"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const adminProfiles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
            setAdmins(adminProfiles);
            setIsLoading(false);
        }, (error: any) => {
            toast({ variant: "destructive", title: "خطأ في جلب المسؤولين", description: error.message });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <PageHeader title="إدارة الفريق" description="إدارة حسابات المسؤولين وصلاحياتهم في المنصة." >
                    <Skeleton className="h-10 w-32" />
                </PageHeader>
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="إدارة الفريق"
                description="إدارة حسابات المسؤولين وصلاحياتهم في المنصة."
            >
                <AddAdminDialog onAdminAdded={() => { /* onSnapshot handles updates */ }}>
                    <Button>
                        <PlusCircle className="ml-2 h-4 w-4" />
                        إضافة مسؤول جديد
                    </Button>
                </AddAdminDialog>
            </PageHeader>
            
            <AdminUsersTable admins={admins} onActionComplete={() => { /* onSnapshot handles updates */ }} />
        </div>
    );
}
