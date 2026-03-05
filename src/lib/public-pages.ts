/**
 * نسخة مُجمّعة للعرض العام فقط — قراءة واحدة بدل عشرات.
 * لا نحذف أي بيانات قديمة؛ الصفحات العامة تحاول القراءة من هنا أولاً، وإلا تعود للطريقة القديمة.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

export type PublicPageData = {
  restaurant: {
    id: string;
    name: string;
    username: string;
    description?: string | null;
    logo?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    applications?: Array<{ id?: string; name?: string; value?: string; url?: string; logo?: string }>;
    socialLinks?: Array<{ platform?: string; value?: string }>;
    is_paid_plan?: boolean;
    [key: string]: unknown;
  };
  menu: Array<{
    id: string;
    name?: string;
    description?: string;
    category?: string;
    image_url?: string;
    status?: string;
    sizes?: Array<{ id?: string; name?: string; price?: number }>;
    position?: number;
    clicks_count?: number;
    [key: string]: unknown;
  }>;
  branches: Array<{
    id: string;
    name?: string;
    address?: string;
    city?: string;
    district?: string;
    phone?: string;
    google_maps_url?: string;
    opening_hours?: string;
    status?: string;
    [key: string]: unknown;
  }>;
  offers: Array<{
    id: string;
    title?: string;
    description?: string;
    image_url?: string;
    external_link?: string;
    valid_until?: unknown;
    status?: string;
    [key: string]: unknown;
  }>;
  reviews_summary: {
    count: number;
    averageRating: number;
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string;
    createdAt?: unknown;
    is_visible?: boolean;
  }>;
  updated_at: unknown;
};

const PUBLIC_PAGES_COLLECTION = 'public_pages';

/**
 * جلب نسخة العرض العام (قراءة واحدة).
 * إذا لم توجد أو حدث خطأ نرجع null حتى تستخدم الصفحة الطريقة القديمة.
 */
export async function getPublicPage(username: string): Promise<PublicPageData | null> {
  if (!username?.trim()) return null;
  try {
    const ref = doc(db, PUBLIC_PAGES_COLLECTION, username.trim().toLowerCase());
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as PublicPageData;
  } catch {
    return null;
  }
}

/**
 * تجميع بيانات العرض العام من المطعم والـ subcollections وكتابتها في public_pages.
 * يُستدعى بعد تعديل المنيو/الفروع/العروض/الإعدادات (أو يدوياً).
 */
export async function syncPublicPage(restaurantId: string): Promise<void> {
  try {
    const restRef = doc(db, 'restaurants', restaurantId);
    const restSnap = await getDoc(restRef);
    if (!restSnap.exists()) return;

    const restData = restSnap.data();
    const username = (restData?.username ?? '').toString().trim().toLowerCase();
    if (!username) return;

    const [menuSnap, branchesSnap, offersSnap, reviewsSnap] = await Promise.all([
      getDocs(collection(db, 'restaurants', restaurantId, 'menu_items')),
      getDocs(query(collection(db, 'restaurants', restaurantId, 'branches'), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'restaurants', restaurantId, 'offers'), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'restaurants', restaurantId, 'reviews'), orderBy('createdAt', 'desc'), limit(100))),
    ]);

    const menu = menuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const branches = branchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const now = new Date();
    const offers = offersSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o: any) => {
        const expiry = o.valid_until?.toDate ? o.valid_until.toDate() : new Date(o.valid_until);
        return expiry > now;
      });

    const reviewsList = reviewsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r: any) => r.is_visible !== false);

    const count = reviewsList.length;
    const totalRating = reviewsList.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
    const distribution = reviewsList.reduce(
      (acc: { 5: number; 4: number; 3: number; 2: number; 1: number }, r: any) => {
        const star = Math.floor(r.rating || 0);
        if (star >= 1 && star <= 5) acc[star as keyof typeof acc]++;
        return acc;
      },
      { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    );

    const payload: PublicPageData = {
      restaurant: {
        id: restSnap.id,
        ...restData,
        name: restData?.name ?? '',
        username,
        description: restData?.description ?? null,
        logo: restData?.logo ?? null,
        primaryColor: restData?.primaryColor ?? null,
        secondaryColor: restData?.secondaryColor ?? null,
        applications: Array.isArray(restData?.applications) ? restData.applications : [],
        socialLinks: Array.isArray(restData?.socialLinks) ? restData.socialLinks : [],
        is_paid_plan: restData?.is_paid_plan ?? false,
      },
      menu,
      branches,
      offers,
      reviews_summary: {
        count,
        averageRating: count > 0 ? totalRating / count : 0,
        distribution,
      },
      reviews: reviewsList,
      updated_at: serverTimestamp(),
    };

    const publicRef = doc(db, PUBLIC_PAGES_COLLECTION, username);
    await setDoc(publicRef, payload);
  } catch (e) {
    console.error('[public-pages] sync failed:', e);
  }
}
