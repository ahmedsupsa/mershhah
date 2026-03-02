
'use client';

import { useState, useEffect, useCallback, useTransition } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { EditToolDialog } from "@/components/admin/store/EditToolDialog";
import { ToolsTable } from "@/components/admin/store/ToolsTable";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";


export default function StoreManagementPage() {
    const [tools, setTools] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    useEffect(() => {
        setIsLoading(true);

        const toolsUnsub = onSnapshot(collection(db, 'tools'), (snapshot) => {
            setTools(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false); 
        }, (error) => {
            console.error("Error fetching tools:", error);
            toast({ title: "فشل تحميل الأدوات", variant: "destructive", description: error.message });
            setIsLoading(false);
        });

        return () => {
            toolsUnsub();
        };
    }, [toast]);


    if (isLoading) {
        return (
             <div className="space-y-6" dir="rtl">
                <PageHeader
                    title="إدارة متجر الأدوات"
                    description="إضافة وتعديل الأدوات المتاحة للمشتركين."
                />
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <Card>
                        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                        <CardContent className="space-y-2">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6" dir="rtl">
            <PageHeader
                title="إدارة متجر الأدوات"
                description="إضافة وتعديل الأدوات المتاحة في المتجر للمشتركين."
            >
                <EditToolDialog onSave={() => {}} allTools={tools}>
                    <Button variant="outline" size="sm" className="gap-1 flex-row-reverse">
                        إضافة أداة
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                </EditToolDialog>
            </PageHeader>
            
            <ToolsTable tools={tools} onActionComplete={() => {}} />

        </div>
    );
}
