'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const DIALOG_COUNTDOWN = 60; // 60 seconds

export function SessionTimeout() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [isIdle, setIsIdle] = useState(false);
  const [countdown, setCountdown] = useState(DIALOG_COUNTDOWN);

  const idleTimerRef = useRef<NodeJS.Timeout>();
  const countdownTimerRef = useRef<NodeJS.Timeout>();

  const handleLogout = useCallback(async () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setIsIdle(false);
    await signOut(auth);
    router.push('/login');
  }, [router]);

  const resetIdleTimer = useCallback(() => {
    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    
    // Close the dialog if it's open
    setIsIdle(false);
    setCountdown(DIALOG_COUNTDOWN);

    // Set a new timer to show the dialog after inactivity
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, IDLE_TIMEOUT);
  }, []);

  // Effect to handle the countdown when the idle dialog is shown
  useEffect(() => {
    if (isIdle) {
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup the interval on component unmount or when dialog is closed
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isIdle, handleLogout]);

  // Effect to setup and cleanup global event listeners for user activity
  useEffect(() => {
    // Only run if there is a logged-in user
    if (!user || isLoading) return;

    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    
    // Reset timer on any activity
    const eventHandler = () => {
        resetIdleTimer();
    };

    // Attach listeners
    events.forEach(event => window.addEventListener(event, eventHandler));
    
    // Initial timer setup
    resetIdleTimer();

    // Cleanup on unmount
    return () => {
      events.forEach(event => window.removeEventListener(event, eventHandler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [user, isLoading, resetIdleTimer]);


  // This component does not render anything itself, only the dialog when triggered.
  // We check for user/loading state inside the effect to control listeners.
  // The dialog's `open` state is controlled by `isIdle`.
  if (!isIdle) return null;

  return (
    <AlertDialog open={isIdle}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>هل ما زلت هنا؟</AlertDialogTitle>
          <AlertDialogDescription>
            سيتم تسجيل خروجك تلقائيًا بسبب عدم النشاط.
            <br />
            سيتم تسجيل الخروج خلال <span className="font-bold text-lg text-destructive">{countdown}</span> ثانية.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={handleLogout}>
            تسجيل الخروج الآن
          </Button>
          <Button onClick={resetIdleTimer}>تمديد الجلسة</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
