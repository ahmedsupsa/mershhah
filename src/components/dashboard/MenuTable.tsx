'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, AlertTriangle, Flame, CheckCircle, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { EditMenuItemDialog } from "./EditMenuItemDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import React, { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, deleteDoc, writeBatch } from "firebase/firestore";
import { StorageImage } from "@/components/shared/StorageImage";
import { MenuItem } from "@/lib/types";

const categoryTranslations: any = {
    main: 'طبق رئيسي',
    appetizer: 'مقبلات',
    dessert: 'حلى',
    drink: 'مشروبات',
    breakfast: 'فطور',
    offer: 'عروض'
}

interface MenuTableProps {
    items: MenuItem[];
    restaurantId: string;
    userId: string;
    onActionCompletion: () => void;
}

export function MenuTable({ items, restaurantId, userId, onActionCompletion }: MenuTableProps) {
  const { toast } = useToast();
  const [isDeleting, startDelete] = useTransition();
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  const handleDelete = () => {
    if (!itemToDelete) return;
    startDelete(async () => {
        const itemRef = doc(db, 'restaurants', restaurantId, 'menu_items', itemToDelete.id);
        try {
            await deleteDoc(itemRef);
            toast({ title: "تم حذف الطبق بنجاح" });
            onActionCompletion();
            setItemToDelete(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ في الحذف", description: error.message });
        }
    });
  };

  const getPriceDisplay = (item: any) => {
    if (!item.sizes || !Array.isArray(item.sizes) || item.sizes.length === 0) {
      return 'N/A';
    }
    if (item.sizes.length === 1) {
        return `${item.sizes[0].price.toFixed(2)} ر.س`;
    }
    const prices = item.sizes.map((s: any) => s.price);
    const minPrice = Math.min(...prices);
    return `يبدأ من ${minPrice.toFixed(2)} ر.س`;
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
              <TableRow>
                  <TableHead className="w-[100px]">صورة</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>التكلفة</TableHead>
                  <TableHead>هامش الربح</TableHead>
                  <TableHead>الاهتمام</TableHead>
                  <TableHead>الترتيب</TableHead>
                  <TableHead><span className="sr-only">الإجراءات</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="h-32 text-center"><div className="flex flex-col items-center justify-center gap-2"><AlertTriangle className="h-10 w-10 text-muted-foreground" /><p className="font-semibold">قائمة طعامك فارغة</p><p className="text-sm text-muted-foreground">ابدأ بإضافة أول طبق لك!</p></div></TableCell></TableRow>
                )}
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell><StorageImage alt={item.name} className="aspect-square rounded-md object-cover" height={64} imagePath={item.image_url} width={64} /></TableCell>
                    <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                            <span>{item.name}</span>
                            {item.display_tags === 'best_seller' && (<Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400/90 w-fit"><Flame className="h-3.5 w-3.5 -ml-1 mr-1" />الأكثر مبيعاً</Badge>)}
                            {item.display_tags === 'new' && (<Badge className="bg-blue-500 text-white hover:bg-blue-500/90 w-fit">جديد</Badge>)}
                        </div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{categoryTranslations[item.category] || item.category}</Badge></TableCell>
                    <TableCell>{item.status !== 'unavailable' ? (<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3.5 w-3.5 -ml-1 mr-1" />متاح</Badge>) : (<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3.5 w-3.5 -ml-1 mr-1" />غير متاح</Badge>)}</TableCell>
                    <TableCell>{getPriceDisplay(item)}</TableCell>
                    <TableCell>
                      {Array.isArray(item.sizes) && item.sizes[0]?.cost != null
                        ? `${item.sizes[0].cost.toFixed(2)} ر.س`
                        : 'غير محددة'}
                    </TableCell>
                    <TableCell>
                      {typeof (item as any).profitMargin === 'number'
                        ? `${((item as any).profitMargin as number).toFixed(0)}%`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {typeof (item as any).popularity === 'number'
                        ? `${(item as any).popularity} تفاعل`
                        : '0 تفاعل'}
                    </TableCell>
                    <TableCell>{item.position ?? 'غير مرتب'}</TableCell>
                    <TableCell>
                        <EditMenuItemDialog menuItem={item} restaurantId={restaurantId} userId={userId} onSave={onActionCompletion} menuItems={items}>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /><span className="sr-only">تعديل</span></Button>
                        </EditMenuItemDialog>
                        <Button onClick={() => setItemToDelete(item)} variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /><span className="sr-only">حذف</span></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
         {items.length === 0 && (
            <Card><CardContent className="p-6 text-center text-muted-foreground"><AlertTriangle className="h-10 w-10 mx-auto mb-2" /><p className="font-semibold">قائمة طعامك فارغة</p></CardContent></Card>
          )}
        {items.map((item, index) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="flex gap-4">
              <div className="relative w-24 h-24 shrink-0">
                <StorageImage alt={item.name} className="object-cover" fill sizes="96px" imagePath={item.image_url} />
              </div>
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                   <h3 className="font-bold text-base mb-1">{item.name}</h3>
                    <Badge variant="outline" className="text-xs">{categoryTranslations[item.category] || item.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-primary">{getPriceDisplay(item)}</span>
                  {item.status !== 'unavailable' ? (<Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className="h-3 w-3 ml-1" />متاح</Badge>) : (<Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs"><XCircle className="h-3 w-3 ml-1" />غير متاح</Badge>)}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>
                    تكلفة تقريبية:{" "}
                    {Array.isArray(item.sizes) && item.sizes[0]?.cost != null
                      ? `${item.sizes[0].cost.toFixed(1)} ر.س`
                      : "غير محددة"}
                  </span>
                  <span>
                    هامش الربح:{" "}
                    {typeof (item as any).profitMargin === "number"
                      ? `${((item as any).profitMargin as number).toFixed(0)}%`
                      : "—"}
                  </span>
                  <span>
                    الاهتمام:{" "}
                    {typeof (item as any).popularity === "number"
                      ? `${(item as any).popularity} تفاعل`
                      : "0 تفاعل"}
                  </span>
                </div>
              </div>
            </div>
             <CardFooter className="p-2 bg-muted/50 flex justify-end gap-1">
                <EditMenuItemDialog menuItem={item} restaurantId={restaurantId} userId={userId} onSave={onActionCompletion} itemCount={items.length} menuItems={items}>
                    <Button variant="ghost" size="sm" className="h-8"><Pencil className="h-4 w-4 ml-1" /> تعديل</Button>
                </EditMenuItemDialog>
                <Button onClick={() => setItemToDelete(item)} variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8"><Trash2 className="h-4 w-4 ml-1" /> حذف</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف طبق "{itemToDelete?.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? "جاري الحذف..." : "حذف"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
