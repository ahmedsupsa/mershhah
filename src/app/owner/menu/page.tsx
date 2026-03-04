'use client';

import PageHeader from "@/components/dashboard/PageHeader";
import { MenuTable } from "@/components/dashboard/MenuTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, RefreshCw, Flame, Utensils, DollarSign, Sparkles, Loader2 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { useEffect, useState, useTransition, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EditMenuItemDialog } from "@/components/dashboard/EditMenuItemDialog";
import { ImportMenuDialog } from "@/components/dashboard/ImportMenuDialog";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { collection, onSnapshot, query, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MenuItem } from "@/lib/types";
import { errorEmitter } from "@/lib/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/lib/firebase/errors";
import { useLanguage } from "@/components/shared/LanguageContext";

type ItemCategory = 'Star' | 'Plow-Horse' | 'Puzzle' | 'Dog';

export default function MenuPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [isRefreshing, startRefresh] = useTransition();
  const [isApplyingSort, startApplyingSort] = useTransition();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const [rawMenuItems, setRawMenuItems] = useState<MenuItem[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user?.restaurantId) {
      setIsFetchingData(true);
      const menuItemsColRef = collection(db, 'restaurants', user.restaurantId, 'menu_items');
      const interactionsColRef = collection(db, 'restaurants', user.restaurantId, 'menu_item_interactions');
      
      const unsubMenu = onSnapshot(menuItemsColRef, (snapshot) => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as MenuItem }));
          setRawMenuItems(items);
          setIsFetchingData(false);
      }, async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: menuItemsColRef.path,
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
          setIsFetchingData(false);
      });

      const unsubInteractions = onSnapshot(interactionsColRef, (snapshot) => {
          const interactionsData = snapshot.docs.map(doc => doc.data());
          setInteractions(interactionsData);
      }, async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: interactionsColRef.path,
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      });

      return () => {
          unsubInteractions();
          unsubMenu();
      };
    } else if (!isUserLoading) {
      setIsFetchingData(false);
    }
  }, [isUserLoading, user?.restaurantId]);

  const menuItems = useMemo(() => {
    const popularityMap = new Map<string, number>();
    interactions.forEach(interaction => {
        const id = interaction.menu_item_id;
        popularityMap.set(id, (popularityMap.get(id) || 0) + 1);
    });

    if (rawMenuItems.length === 0) {
        return [];
    }

    const analyzedItems = rawMenuItems.map(item => {
        const size = item.sizes?.[0] || { price: 0, cost: 0 };
        const profit = size.price - (size.cost || 0);
        const profitMargin = size.price > 0 ? (profit / size.price) * 100 : 0;
        const popularity = popularityMap.get(item.id) || 0;
        return { ...item, profit, profitMargin, popularity };
    });

    const margins = analyzedItems.map(i => i.profitMargin).sort((a,b) => a-b);
    const popularities = analyzedItems.map(i => i.popularity).sort((a,b) => a-b);
    const medianMargin = margins.length > 0 ? margins[Math.floor(margins.length / 2)] : 0;
    const medianPopularity = popularities.length > 0 ? popularities[Math.floor(popularities.length / 2)] : 0;

    const classificationOrder: Record<ItemCategory, number> = {
        'Star': 1,
        'Puzzle': 2,
        'Plow-Horse': 3,
        'Dog': 4,
    };

    const classifiedItems = analyzedItems.map(item => {
        let classification: ItemCategory = 'Dog';
        const highProfit = item.profitMargin >= medianMargin;
        const highPopularity = item.popularity >= medianPopularity;

        if (highProfit && highPopularity) classification = 'Star';
        else if (highProfit && !highPopularity) classification = 'Puzzle';
        else if (!highProfit && highPopularity) classification = 'Plow-Horse';
        
        return { ...item, classification };
    });

    const popularityThreshold = popularities.length > 4 ? popularities[Math.floor(popularities.length * 0.8)] : 0;

    const itemsWithSmartTags = classifiedItems.map(item => {
        let smartTag: MenuItem['display_tags'] = 'none';
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (item.createdAt && item.createdAt.toDate && item.createdAt.toDate() > sevenDaysAgo) {
            smartTag = 'new';
        } 
        else if (item.classification === 'Star' && item.popularity > 0 && item.popularity >= popularityThreshold) {
            smartTag = 'best_seller';
        }
        
        return { ...item, display_tags: smartTag };
    });
    
    const sortedItems = itemsWithSmartTags.sort((a, b) => {
        const orderA = classificationOrder[a.classification];
        const orderB = classificationOrder[b.classification];
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return b.popularity - a.popularity;
    });

    return sortedItems;
}, [rawMenuItems, interactions]);


  const handleRefresh = () => {
    startRefresh(() => {
      toast({ title: t('menu.dataUpdatedAuto') });
    });
  };

  const handleApplySmartSort = () => {
    if (!user?.restaurantId || menuItems.length === 0) {
        toast({
            title: t('menu.noDataForSort'),
            variant: "destructive"
        });
        return;
    }

    startApplyingSort(async () => {
        const batch = writeBatch(db);
        
        menuItems.forEach((item, index) => {
            const itemRef = doc(db, 'restaurants', user.restaurantId!, 'menu_items', item.id);
            batch.update(itemRef, { 
                position: index,
                display_tags: item.display_tags || 'none',
            });
        });

        try {
            await batch.commit();
            toast({
                title: t('menu.smartSortApplied'),
                description: t('menu.smartSortDesc'),
            });
        } catch (error: any) {
            const permissionError = new FirestorePermissionError({
              path: `restaurants/${user.restaurantId}/menu_items`,
              operation: 'update',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        }
    });
  };

  const loadingOrNoUser = isFetchingData || isUserLoading;

  const popularItem = menuItems.find(item => item.status === 'available') || null;
  const totalItems = menuItems.length;
  const availableItems = menuItems.filter(item => item.status === 'available').length;
  
  const calculateAveragePrice = () => {
    if (availableItems === 0) return 0;
    const allPrices = menuItems
      .filter(item => item.status === 'available')
      .flatMap(item => (Array.isArray(item.sizes) ? item.sizes.map(size => size.price) : []));
    if (allPrices.length === 0) return 0;
    const total = allPrices.reduce((sum, price) => sum + price, 0);
    return total / allPrices.length;
  };
  const avgPrice = calculateAveragePrice();

  const iconMargin = isRTL ? 'ml-2' : 'mr-2';

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('menu.manageMenu')}
        description={t('menu.manageMenuDesc')}
      >
          <Button variant="outline" onClick={handleApplySmartSort} disabled={isApplyingSort || loadingOrNoUser}>
              {isApplyingSort ? <Loader2 className={`${iconMargin} h-4 w-4 animate-spin`}/> : <Sparkles className={`${iconMargin} h-4 w-4`} />}
              {t('menu.applySmartSort')}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing || loadingOrNoUser}>
            <RefreshCw className={`${iconMargin} h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('menu.refresh')}
          </Button>
          
          <ImportMenuDialog restaurantId={user?.restaurantId} onSave={() => {}}>
            <Button variant="outline" disabled={loadingOrNoUser || !user}>
                <Sparkles className={`${iconMargin} h-4 w-4`} />
                {t('menu.importFromImage')}
            </Button>
          </ImportMenuDialog>

          <EditMenuItemDialog 
            restaurantId={user?.restaurantId} 
            userId={user?.uid} 
            onSave={() => {}} 
            itemCount={menuItems.length}
            menuItems={rawMenuItems}
          >
            <Button disabled={loadingOrNoUser || !user}>
              <PlusCircle className={`${iconMargin} h-4 w-4`} />
              {t('menu.addNewItem')}
            </Button>
          </EditMenuItemDialog>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingOrNoUser ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <StatCard 
              title={t('menu.mostPopularItem')} 
              value={popularItem?.name || t('menu.noItem')} 
              icon={Flame} 
              change={t('menu.basedOnInteraction')} 
            />
            <StatCard 
              title={t('menu.totalItems')} 
              value={totalItems.toString()} 
              icon={Utensils} 
              change={`${availableItems} ${t('menu.itemsAvailable')}`} 
            />
            <StatCard 
              title={t('menu.avgPrice')} 
              value={`${avgPrice.toFixed(2)} ${t('menu.sar')}`} 
              icon={DollarSign} 
              change={t('menu.forAllAvailable')} 
            />
          </>
        )}
      </div>

      {loadingOrNoUser ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : (
        <MenuTable items={menuItems} restaurantId={user!.restaurantId!} userId={user!.uid} onActionCompletion={() => {}} />
      )}
    </div>
  );
}
