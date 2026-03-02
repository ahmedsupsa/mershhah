'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Profile, Task } from '@/lib/types';
import PageHeader from "@/components/dashboard/PageHeader";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddTaskDialog } from '@/components/admin/workflow/AddTaskDialog';
import { TaskCard } from '@/components/admin/workflow/TaskCard';
import { useUser } from '@/hooks/useUser';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


const columns: { id: Task['status']; title: string }[] = [
  { id: 'todo', title: 'مهام جديدة' },
  { id: 'in-progress', title: 'قيد التنفيذ' },
  { id: 'review', title: 'للمراجعة' },
  { id: 'done', title: 'تم الإنجاز' },
];

export default function WorkflowPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [admins, setAdmins] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useUser();
    const [myTasksOnly, setMyTasksOnly] = useState(false);

    const fetchAdmins = useCallback(async () => {
        try {
            const q = query(collection(db, "profiles"), where("role", "==", "admin"));
            const querySnapshot = await getDocs(q);
            const adminProfiles = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Profile));
            setAdmins(adminProfiles);
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ في جلب المسؤولين", description: error.message });
        }
    }, [toast]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    useEffect(() => {
        const tasksQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(fetchedTasks);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching tasks:", error);
            toast({ variant: "destructive", title: "خطأ في جلب المهام", description: error.message });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const filteredTasks = useMemo(() => {
        if (!user) return [];
        if (myTasksOnly) {
            return tasks.filter(task => task.assigneeId === user.uid);
        }
        return tasks;
    }, [tasks, myTasksOnly, user]);

    const groupedTasks = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            (acc[task.status] = acc[task.status] || []).push(task);
            return acc;
        }, {} as Record<Task['status'], Task[]>);
    }, [filteredTasks]);
    
    const handleTaskUpdate = () => {
        // The onSnapshot listener will handle the UI update automatically.
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <PageHeader title="سير العمل" description="نظّم مهام فريقك وتتبع التقدم المحرز." />
                 <div className="flex-1 overflow-x-auto overflow-y-hidden py-6">
                    <div className="flex gap-6 items-start">
                        {columns.map(col => (
                            <div key={col.id} className="w-80 shrink-0">
                                <Skeleton className="h-8 w-3/4 mb-4" />
                                <div className="space-y-4 h-full bg-muted/50 p-4 rounded-xl border">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-24 w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader
                title="سير العمل"
                description="نظّم مهام فريقك وتتبع التقدم المحرز في المشاريع."
            >
                <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch id="my-tasks-only" checked={myTasksOnly} onCheckedChange={setMyTasksOnly} />
                    <Label htmlFor="my-tasks-only">عرض مهامي فقط</Label>
                </div>
            </PageHeader>
            
            <div className="flex-1 overflow-x-auto overflow-y-hidden py-6">
                <div className="flex gap-6 items-start">
                    {columns.map((col) => (
                        <div key={col.id} className="w-80 shrink-0">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    {col.title}
                                    <Badge variant="secondary">{(groupedTasks[col.id] || []).length}</Badge>
                                </h2>
                            </div>
                            <div className="space-y-4 h-full bg-muted/50 p-4 rounded-xl border">
                                {(groupedTasks[col.id] || []).map(task => (
                                    <TaskCard key={task.id} task={task} onTaskUpdate={handleTaskUpdate} />
                                ))}
                                {(!groupedTasks[col.id] || groupedTasks[col.id].length === 0) && (
                                    <div className="text-center text-sm text-muted-foreground pt-10">لا توجد مهام هنا.</div>
                                )}
                                <AddTaskDialog admins={admins} status={col.id} onTaskAdded={() => {}}>
                                    <Button variant="outline" className="w-full mt-4">
                                        <PlusCircle className="ml-2 h-4 w-4"/>
                                        إضافة مهمة جديدة
                                    </Button>
                                </AddTaskDialog>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
