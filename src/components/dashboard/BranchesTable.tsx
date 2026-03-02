
'use client';

import React, { useState, useTransition } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, MoreHorizontal, Building2, MapPin, CheckCircle, XCircle, Phone, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { EditBranchDialog } from "./EditBranchDialog";
import { Branch } from "@/lib/types";
import Link from "next/link";

interface BranchesTableProps {
  branches: Branch[];
  restaurantId: string;
  onActionCompletion: () => void;
}

export function BranchesTable({ branches, restaurantId, onActionCompletion }: BranchesTableProps) {
  const { toast } = useToast();
  const [isDeleting, startDelete] = useTransition();
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  const handleDelete = () => {
    if (!branchToDelete) return;
    startDelete(async () => {
        const branchRef = doc(db, 'restaurants', restaurantId, 'branches', branchToDelete.id);
        try {
            await deleteDoc(branchRef);
            toast({ title: "تم حذف الفرع بنجاح" });
            onActionCompletion();
            setBranchToDelete(null);
        } catch (error: any) {
            toast({ variant: "destructive", title: "خطأ في الحذف", description: error.message });
        }
    });
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الفرع</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.length > 0 ? branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{branch.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{branch.city}, {branch.district}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className={branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {branch.status === 'active' ? <CheckCircle className="h-3 w-3 ml-1" /> : <XCircle className="h-3 w-3 ml-1" />}
                        {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <EditBranchDialog branch={branch} restaurantId={restaurantId} onSave={onActionCompletion}><DropdownMenuItem onSelect={(e) => e.preventDefault()}><Pencil className="mr-2 h-4 w-4" /> تعديل</DropdownMenuItem></EditBranchDialog>
                          <DropdownMenuItem onClick={() => setBranchToDelete(branch)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> حذف</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">لم تقم بإضافة أي فروع بعد.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {branches.length > 0 ? branches.map(branch => (
          <Card key={branch.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{branch.name}</CardTitle>
                <Badge variant={branch.status === 'active' ? 'default' : 'secondary'} className={`text-xs ${branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {branch.status === 'active' ? 'نشط' : 'غير نشط'}
                </Badge>
              </div>
              <CardDescription>{branch.city}, {branch.district}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{branch.address}</p>
              <div className="flex gap-2 mt-2">
                {branch.phone && <a href={`tel:${branch.phone}`} className="text-sm flex items-center gap-1 text-primary"><Phone className="h-3 w-3" /><span>{branch.phone}</span></a>}
                {branch.google_maps_url && <a href={branch.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-sm flex items-center gap-1 text-primary"><Navigation className="h-3 w-3" /><span>عرض على الخريطة</span></a>}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-2">
              <EditBranchDialog branch={branch} restaurantId={restaurantId} onSave={onActionCompletion}><Button size="sm" variant="ghost"><Pencil className="h-4 w-4 ml-2"/>تعديل</Button></EditBranchDialog>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setBranchToDelete(branch)}><Trash2 className="h-4 w-4 ml-2"/>حذف</Button>
            </CardFooter>
          </Card>
        )) : (
          <Card><CardContent className="text-center p-8 text-muted-foreground">لم تقم بإضافة أي فروع بعد.</CardContent></Card>
        )}
      </div>

      <AlertDialog open={!!branchToDelete} onOpenChange={(open) => !open && setBranchToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle><AlertDialogDescription>سيتم حذف فرع "{branchToDelete?.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? "جاري الحذف..." : "حذف"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
