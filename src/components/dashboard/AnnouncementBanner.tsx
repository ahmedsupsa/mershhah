'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const typeConfig = {
    info: { icon: Info, className: "text-blue-500 border-blue-200 bg-blue-50" },
    warning: { icon: AlertTriangle, className: "text-yellow-500 border-yellow-200 bg-yellow-50" },
    success: { icon: CheckCircle, className: "text-green-500 border-green-200 bg-green-50" },
    update: { icon: Bell, className: "text-purple-500 border-purple-200 bg-purple-50" },
};

export function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Query only for active announcements, order them on the client to avoid composite indexes
        const q = query(
            collection(db, "announcements"),
            where('isActive', '==', true)
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allActiveAnnouncements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            
            // Sort client-side to get the latest one first
            allActiveAnnouncements.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            // Find the first relevant announcement for the user (owner or all)
            const latestAnn = allActiveAnnouncements.find(ann => ['owner', 'all'].includes(ann.targetRole));

            if (latestAnn) {
                const dismissedId = localStorage.getItem('dismissed-announcement');
                if (dismissedId !== latestAnn.id) {
                    setAnnouncement(latestAnn);
                    setIsVisible(true);
                } else {
                    setAnnouncement(null);
                    setIsVisible(false);
                }
            } else {
                setAnnouncement(null);
                setIsVisible(false);
            }
        }, (error) => {
            // Log error but don't crash the component
            console.error("Error fetching announcements:", error);
            setAnnouncement(null);
            setIsVisible(false);
        });
        
        return () => unsubscribe();
    }, []);
    
    const handleDismiss = () => {
        if (announcement) {
            localStorage.setItem('dismissed-announcement', announcement.id);
            setIsVisible(false);
        }
    };
    
    const Icon = announcement ? typeConfig[announcement.type].icon : Info;
    const style = announcement ? typeConfig[announcement.type].className : '';

    return (
        <AnimatePresence>
            {isVisible && announcement && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, padding: 0, margin: 0, transition: { duration: 0.3 } }}
                    className="mb-6 overflow-hidden"
                >
                    <Alert className={style}>
                        <Icon className="h-5 w-5" />
                        <AlertTitle className="font-bold">{announcement.title}</AlertTitle>
                        <AlertDescription>
                            {announcement.content}
                        </AlertDescription>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 left-3 h-6 w-6"
                            onClick={handleDismiss}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Alert>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
