'use client';

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Bot, Loader2, FileCheck, Save, Sparkles, X, AlertCircle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { extractMenuFromImage, ExtractMenuOutput } from "@/ai/flows/extract-menu-from-image";
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { Badge } from "../ui/badge";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

interface ImportMenuDialogProps {
  children: React.ReactNode;
  restaurantId?: string | null;
  onSave: () => void;
}

type Stage = "upload" | "analyzing" | "confirm" | "saving";

export function ImportMenuDialog({ children, restaurantId, onSave }: ImportMenuDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stage, setStage] = useState<Stage>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractMenuOutput['extractedItems']>([]);
  const [usageStats, setUsageStats] = useState({ count: 0, limit: 3 });
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  const isPaid = user?.entitlements?.planId && user.entitlements.planId !== 'free';
  const monthlyLimit = isPaid ? 20 : 3;

  useEffect(() => {
    if (open && restaurantId) {
        fetchUsageStats();
    }
  }, [open, restaurantId, isPaid]);

  const fetchUsageStats = async () => {
    if (!restaurantId) return;
    setIsCheckingUsage(true);
    try {
        const restaurantRef = doc(db, 'restaurants', restaurantId);
        const docSnap = await getDoc(restaurantRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            let count = data.menu_import_monthly_count || 0;
            const lastReset = data.menu_import_last_reset?.toDate();
            const now = new Date();

            const shouldReset = !lastReset || (now.getTime() - lastReset.getTime() > 30 * 24 * 60 * 60 * 1000);
            
            if (shouldReset) {
                await updateDoc(restaurantRef, {
                    menu_import_monthly_count: 0,
                    menu_import_last_reset: serverTimestamp()
                });
                count = 0;
            }
            
            setUsageStats({ count, limit: monthlyLimit });
        }
    } catch (error) {
        console.error("Error fetching usage stats:", error);
    } finally {
        setIsCheckingUsage(false);
    }
  };

  const resetState = () => {
    setStage("upload");
    setImageFile(null);
    setImagePreview(null);
    setExtractedData([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) {
            toast({ title: "حجم الصورة كبير", description: "الرجاء اختيار صورة بحجم أقل من 4 ميجابايت.", variant: "destructive" });
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !restaurantId) return;

    if (usageStats.count >= usageStats.limit) {
        toast({
            title: "عذراً، انتهت محاولاتك",
            description: isPaid 
                ? "لقد استنفدت 20 محاولة لهذا الشهر." 
                : "لقد استنفدت 3 محاولات مجانية لهذا الشهر. قم بالترقية للحصول على محاولات أكثر.",
            variant: "destructive"
        });
        return;
    }

    setStage("analyzing");

    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = async () => {
        try {
            const result = await extractMenuFromImage({
                menuImageDataUri: reader.result as string,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            if (result.extractedItems && result.extractedItems.length > 0) {
                const restaurantRef = doc(db, 'restaurants', restaurantId);
                await updateDoc(restaurantRef, {
                    menu_import_monthly_count: increment(1)
                });
                
                setExtractedData(result.extractedItems);
                setStage("confirm");
                fetchUsageStats();
                toast({ title: "تم تحليل القائمة!", description: `تم العثور على ${result.extractedItems.length} صنف.` });
            } else {
                toast({ title: "لم يتم العثور على أصناف", description: "حاول استخدام صورة أوضح أو تأكد من إضاءة الغرفة.", variant: "destructive" });
                setStage("upload");
            }
        } catch (error: any) {
            console.error("Analysis Error:", error);
            toast({ title: "فشل التحليل", description: error.message, variant: "destructive" });
            setStage("upload");
        }
    };
  };

  const handleSaveToMenu = async () => {
    if (!restaurantId || extractedData.length === 0) return;
    setStage("saving");
    
    try {
        const batch = writeBatch(db);
        const menuItemsCollection = collection(db, 'restaurants', restaurantId, 'menu_items');
        
        extractedData.forEach(item => {
            const newItemRef = doc(menuItemsCollection);
            batch.set(newItemRef, {
                id: newItemRef.id,
                name: item.name,
                description: item.description || "",
                category: item.category || 'main',
                sizes: item.sizes.map(s => ({ 
                    id: `size-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    name: s.name, 
                    price: s.price, 
                    cost: 0 
                })),
                calories: item.calories || null,
                image_url: "",
                status: 'available',
                display_tags: 'none',
                restaurant_id: restaurantId,
                createdAt: serverTimestamp(),
            });
        });

        await batch.commit();
        toast({ title: "تم حفظ الأصناف!", description: `تمت إضافة ${extractedData.length} صنف بنجاح.` });
        onSave();
        setOpen(false);
    } catch (error: any) {
        console.error("Save error:", error);
        toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
        setStage("confirm");
    }
  };

  const isLimitReached = usageStats.count >= usageStats.limit;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); setOpen(isOpen); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-right">
                <DialogTitle className="flex items-center gap-2 text-xl font-black justify-end">
                    إضافة أصناف بالذكاء الاصطناعي
                    <Sparkles className="text-primary h-6 w-6"/> 
                </DialogTitle>
                <DialogDescription>
                    ارفع صورة من قائمة طعامك ودع الذكاء الاصطناعي يقوم بتعبئة البيانات نيابة عنك.
                </DialogDescription>
            </div>
            <Badge variant={isLimitReached ? "destructive" : "outline"} className="gap-1.5 py-1 px-3">
                {isCheckingUsage ? <Loader2 className="h-3 w-3 animate-spin"/> : (
                    <>
                        محاولاتك: {usageStats.count} / {usageStats.limit}
                    </>
                )}
            </Badge>
          </div>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
            <motion.div
                key={stage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto min-h-[400px] p-1"
            >
                {stage === "upload" && (
                    <div className="flex flex-col items-center justify-center h-full gap-6">
                        <div 
                            className="relative w-full max-w-lg aspect-[4/3] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-muted/50 transition-all group overflow-hidden bg-muted/20"
                            onClick={() => !isLimitReached && fileInputRef.current?.click()}
                        >
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                            {imagePreview ? (
                                <img src={imagePreview} alt="Menu Preview" className="object-contain h-full w-full rounded-md" />
                            ) : (
                                <div className="text-muted-foreground space-y-3">
                                    <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto group-hover:scale-110 transition-transform">
                                        <UploadCloud className="h-10 w-10 text-primary" />
                                    </div>
                                    <p className="font-bold text-lg text-foreground">اضغط لرفع صورة المنيو</p>
                                    <p className="text-xs max-w-xs mx-auto">تأكد أن الصورة واضحة والأسعار ظاهرة لنتائج أفضل.</p>
                                </div>
                            )}
                            {isLimitReached && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 gap-2">
                                <Lock className="h-10 w-10 text-muted-foreground" />
                                <p className="font-bold text-center">لقد وصلت للحد الأقصى لهذا الشهر</p>
                                {!isPaid && <Button asChild size="sm" className="mt-2"><Link href="/pricing">اشترك لزيادة حد المحاولات</Link></Button>}
                            </div>}
                        </div>
                        
                        <Button 
                            onClick={handleAnalyze} 
                            disabled={!imageFile || isLimitReached} 
                            size="lg" 
                            className="h-14 px-8 text-lg font-bold shadow-lg"
                        >
                            <Bot className="ml-2 h-5 w-5" /> 
                            ابدأ قراءة الأصناف
                        </Button>
                    </div>
                )}

                {stage === "analyzing" && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-6">
                        <div className="relative">
                            <Loader2 className="h-20 w-20 text-primary animate-spin" />
                            <Bot className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black">جاري تحليل القائمة...</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">يقوم الذكاء الاصطناعي الآن بقراءة النصوص وتحويلها إلى بيانات منظمة.</p>
                        </div>
                    </div>
                )}
                
                 {stage === "confirm" && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-green-50 border border-green-100 p-4 rounded-xl">
                           <div className="flex items-center gap-3">
                               <div className="bg-green-500 p-2 rounded-full text-white"><FileCheck className="h-5 w-5" /></div>
                               <div className="text-right">
                                   <h3 className="font-black">اكتمل الاستخراج بنجاح!</h3>
                                   <p className="text-xs text-green-700">تم العثور على {extractedData.length} صنف مع أسعارها.</p>
                               </div>
                           </div>
                           <Button variant="ghost" size="sm" onClick={resetState} className="text-green-700 hover:bg-green-100"><X className="ml-2 h-4 w-4"/> إلغاء</Button>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto border rounded-xl divide-y">
                            {extractedData.map((item, index) => (
                                <div key={index} className="p-4 hover:bg-muted/30 transition-colors text-right">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-base">{item.name}</h4>
                                        <Badge variant="secondary" className="font-medium">{item.category}</Badge>
                                    </div>
                                    {item.description && <p className="text-xs text-muted-foreground leading-relaxed mb-3">{item.description}</p>}
                                    <div className="flex gap-2 flex-wrap justify-end">
                                        {item.sizes.map((size, sIndex) => (
                                            <Badge key={sIndex} variant="outline" className="bg-background font-mono text-sm font-bold border-primary/20 text-primary">
                                                {size.name}: {size.price} ر.س
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                 {stage === "saving" && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <h3 className="text-xl font-bold">جاري إضافة الأصناف إلى قائمتك...</h3>
                    </div>
                )}

            </motion.div>
        </AnimatePresence>

        <DialogFooter className="pt-4 border-t px-0">
          {stage === 'confirm' && (
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>يمكنك إضافة صور المنتجات يدوياً لكل طبق بعد الحفظ.</span>
                 </div>
                 <Button onClick={handleSaveToMenu} size="lg" className="w-full sm:w-auto h-12 px-10 font-bold">
                    <Save className="ml-2 h-5 w-5" />
                    إضافة {extractedData.length} أصناف للمنيو
                </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
