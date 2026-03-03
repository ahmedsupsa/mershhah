'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Profile, Restaurant, Subscription } from '@/lib/types';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

export type Entitlements = {
  planId: string;
  planName: string;
  endDate: Date | null;
  canUseAiAnalysis: boolean;
  canUseStudioImageGeneration: boolean;
  canUseDashboardAgent: boolean;
};

const defaultEntitlements: Entitlements = {
  planId: 'none',
  planName: 'لا يوجد',
  endDate: null,
  canUseAiAnalysis: false,
  canUseStudioImageGeneration: false,
  canUseDashboardAgent: false,
};

export type AppUser = Profile & Partial<Omit<Restaurant, 'id'>> & { 
  uid: string, 
  restaurantId?: string,
  entitlements: Entitlements,
};

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let profileUnsubscribe: () => void = () => {};
    let restaurantUnsubscribe: () => void = () => {};
    let subscriptionUnsubscribe: () => void = () => {};

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up all previous listeners
      profileUnsubscribe();
      restaurantUnsubscribe();
      subscriptionUnsubscribe();

      if (firebaseUser) {
        const profileRef = doc(db, 'profiles', firebaseUser.uid);
        
        profileUnsubscribe = onSnapshot(profileRef, (profileSnap) => {
          if (profileSnap.exists()) {
            const profileData = profileSnap.data() as Profile;
            
            // 1. Initial State with Profile Data
            const initialCombinedUser: AppUser = { 
              ...profileData, 
              uid: firebaseUser.uid,
              entitlements: defaultEntitlements,
            };
            setUser(initialCombinedUser);

            // 2. Listener for Restaurant Data (if owner)
            if (profileData.role === 'owner' && profileData.restaurant_id) {
              const restaurantRef = doc(db, 'restaurants', profileData.restaurant_id);
              restaurantUnsubscribe = onSnapshot(restaurantRef, (restSnap) => {
                if (restSnap.exists()) {
                  const { id, ...restData } = restSnap.data() as Restaurant;
                  setUser(currentUser => currentUser ? {
                      ...currentUser, 
                      ...restData, 
                      restaurantId: restSnap.id 
                  } : null);
                }
              }, async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: restaurantRef.path,
                  operation: 'get',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
              });
            }

            // 3. Listener for Subscription Data
            const subsCollectionRef = collection(db, 'profiles', firebaseUser.uid, 'subscriptions');
            const subsQuery = query(subsCollectionRef, where('status', '==', 'active'));
            subscriptionUnsubscribe = onSnapshot(subsQuery, (subsSnap) => {
              let activeSub: Subscription | null = null;
              const now = new Date();
              
              subsSnap.forEach(docSnap => {
                  const sub = docSnap.data() as Subscription;
                  const subEndDate = sub.end_date?.toDate ? sub.end_date.toDate() : new Date(0);
                  
                  if (subEndDate > now) {
                      if (!activeSub) {
                          activeSub = sub;
                      } else {
                          // PRIORITY LOGIC:
                          // 1. Prefer Paid plans over Free plans (free plans often have 100-year expiry)
                          // 2. Otherwise, prefer the one with the furthest expiry date
                          const currentIsPaid = activeSub.plan_id !== 'free' && activeSub.plan_id !== 'none';
                          const nextIsPaid = sub.plan_id !== 'free' && sub.plan_id !== 'none';
                          const activeSubEndDate = activeSub.end_date.toDate();

                          if (nextIsPaid && !currentIsPaid) {
                              activeSub = sub;
                          } else if (nextIsPaid === currentIsPaid && subEndDate > activeSubEndDate) {
                              activeSub = sub;
                          }
                      }
                  }
              });
              
              setUser(currentUser => {
                  if (!currentUser) return null;

                  let newEntitlements = defaultEntitlements;

                  if (activeSub) {
                    const isPaidPlan = activeSub.plan_id !== 'free' && activeSub.plan_id !== 'none';
                    const hasTrial = !isPaidPlan && !currentUser.ai_trial_used;
                    const enableAi = isPaidPlan || hasTrial;

                    newEntitlements = {
                      planId: activeSub.plan_id,
                      planName: activeSub.plan_name,
                      endDate: activeSub.end_date.toDate(),
                      canUseAiAnalysis: enableAi,
                      canUseStudioImageGeneration: enableAi,
                      canUseDashboardAgent: enableAi,
                    };
                  }

                  return {
                      ...currentUser,
                      entitlements: newEntitlements,
                  };
              });

              setIsLoading(false);
            }, async (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: subsCollectionRef.path,
                  operation: 'list',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
                setIsLoading(false);
            });

          } else {
            setUser(null);
            setIsLoading(false);
          }
        }, async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: profileRef.path,
              operation: 'get',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
            setUser(null);
            setIsLoading(false);
        });

      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
        authUnsubscribe();
        profileUnsubscribe();
        restaurantUnsubscribe();
        subscriptionUnsubscribe();
    };
  }, []);

  return { user, isLoading };
}
