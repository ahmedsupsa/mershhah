'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';

export function FirebaseErrorListener() {
  useEffect(() => {
    const unsubscribe = errorEmitter.on(
      'permission-error',
      (error: FirestorePermissionError) => {
        // Throwing the error here will cause it to be displayed
        // in the Next.js development overlay, which is the desired behavior.
        throw error;
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // This component does not render anything to the DOM.
  return null;
}
