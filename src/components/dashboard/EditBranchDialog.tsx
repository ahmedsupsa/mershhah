'use client';

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Check, ChevronsUpDown, Search, ArrowLeft } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, updateDoc, increment } from "firebase/firestore";
import saGeodata from '@/data/sa-geodata.json';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { fetchPlaceDetails } from "@/ai/flows/fetch-place-details";
import { searchPlaces, SearchPlacesOutput } from "@/ai/flows/search-places";
import { Label } from "../ui/label";

const formSchema = z.object({
  name: z.string().min(2, "اسم الفرع مطلوب (مثال: فرع العليا)"),
  city: z.string().min(3, "اسم المدينة مطلوب"),
  district: z.string().min(3, "اسم الحي مطلوب"),
  address: z.string().min(10, "العنوان التفصيلي مطلوب"),
  phone: z.string().optional(),
  google_maps_url: z.string().url({ message: "الرجاء إدخال رابط خرائط جوجل صحيح" }).optional().or(z.literal('')),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

type FormValues = z.infer<typeof formSchema>;
type Stage = 'search' | 'select' | 'fetching' | 'confirm';

interface EditBranchDialogProps {
  children: React.ReactNode;
  branch?: any;
  onSave?: () => void;
  restaurantId: string;
}

const cities = Object.keys(saGeodata);

export function EditBranchDialog({ children, branch, onSave, restaurantId }: EditBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isFetching, startFetching] = useTransition();
  const [stage, setStage] = useState<Stage>('search');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchPlacesOutput['places']>([]);

  const { toast } = useToast();
  const isEditing = !!branch;

  const [cityOpen, setCityOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", city: "", district: "", address: "", phone: "", google_maps_url: "", status: 'active' }
  });

  const selectedCity = form.watch('city');
  const districts = saGeodata[selectedCity as keyof typeof saGeodata] || [];

  const resetDialog = () => {
    form.reset();
    setStage('search');
    setSearchQuery("");
    setSearchResults([]);
  };

  useEffect(() => {
    if (open) {
      if (isEditing && branch) {
        form.reset({
            ...branch,
            phone: branch.phone ?? "",
            google_maps_url: branch.google_maps_url ?? "",
        });
        setStage('confirm');
      } else {
        resetDialog();
      }
    }
  }, [open, branch, isEditing, form]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
      if (!searchQuery) {
          toast({ title: "الرجاء إدخال اسم للبحث", variant: "destructive" });
          return;
      }
      startFetching(async () => {
        try {
          // Client-side counter increment (Requires Auth)
          if (restaurantId) {
            const restaurantRef = doc(db, 'restaurants', restaurantId);
            updateDoc(restaurantRef, { maps_search_daily_count: increment(1) }).catch(() => {});
          }

          const results = await searchPlaces({ query: searchQuery });
          if(results.places.length === 0){
            toast({ title: "لم يتم العثور على نتائج", description: "حاول استخدام اسم أو عنوان أكثر تحديداً." });
            return;
          }
          setSearchResults(results.places);
          setStage('select');
        } catch (error: any) {
          toast({ title: "خطأ في البحث", description: error.message, variant: "destructive" });
        }
      });
  };

  const handleSelectPlace = (placeId: string) => {
    startFetching(async () => {
      setStage('fetching');
      try {
        // Client-side counter increment (Requires Auth)
        if (restaurantId) {
            const restaurantRef = doc(db, 'restaurants', restaurantId);
            updateDoc(restaurantRef, { maps_details_daily_count: increment(1) }).catch(() => {});
        }

        const details = await fetchPlaceDetails({ placeId });
        form.reset({
          name: details.name || "",
          address: details.address || "",
          city: details.city || "",
          district: details.district || "",
          phone: details.phone || "",
          google_maps_url: details.google_maps_url || "",
          latitude: details.latitude,
          longitude: details.longitude,
          status: 'active',
        });
        setStage('confirm');
        toast({ title: "تم جلب بيانات الفرع بنجاح!", description: "يرجى مراجعة البيانات قبل الحفظ." });
      } catch (error: any) {
        toast({ title: "خطأ في جلب التفاصيل", description: error.message, variant: "destructive" });
        setStage('select');
      }
    });
  };

  async function onSubmit(values: FormValues) {
    if (!restaurantId) return toast({ variant: "destructive", title: "خطأ", description: "معرف المشروع غير موجود." });
    
    startSaving(async () => {
        try {
          const branchData = { ...values, restaurant_id: restaurantId };
          const branchesCollection = collection(db, 'restaurants', restaurantId, 'branches');
          if (isEditing) {
              const branchRef = doc(branchesCollection, branch.id);
              await updateDoc(branchRef, branchData);
          } else {
              await addDoc(branchesCollection, branchData);
          }
          toast({ title: `تم ${isEditing ? 'تعديل' : 'إضافة'} الفرع بنجاح` });
          onSave?.();
          setOpen(false);
        } catch (error: any) {
           toast({ variant: "destructive", title: "حدث خطأ", description: error.message });
        }
    });
  }

  const renderContent = () => {
      if (isFetching) {
          return (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">جاري جلب البيانات...</p>
              </div>
          )
      }

      if (stage === 'search') {
          return (
            <form onSubmit={handleSearch} className="py-4 space-y-4">
             <div className="space-y-2">
                <Label htmlFor="searchQuery">ابحث عن اسم المطعم أو عنوانه</Label>
                <div className="flex gap-2">
                  <Input id="searchQuery" placeholder="مثال: مطعم البيك، حي الياسمين" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Button type="submit" disabled={isFetching}><Search className="ml-2 h-4 w-4" /> بحث</Button>
                </div>
             </div>
            </form>
          )
      }
      
      if (stage === 'select') {
        return (
          <div className="py-4 space-y-3">
            <h3 className="font-bold">اختر الفرع الصحيح من القائمة:</h3>
            <div className="max-h-[350px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {searchResults.map((place) => (
                <div key={place.id} onClick={() => handleSelectPlace(place.id)} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0"/>
                  <div className="flex-1">
                    <p className="font-semibold">{place.displayName}</p>
                    <p className="text-xs text-muted-foreground">{place.formattedAddress}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      if (stage === 'confirm') {
          return (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>اسم الفرع</FormLabel><FormControl><Input placeholder="مثال: فرع العليا" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>المدينة</FormLabel><Popover open={cityOpen} onOpenChange={setCityOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? cities.find(c => c === field.value) || field.value : "اختر مدينة..."}<ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="ابحث..." /><CommandList><CommandEmpty>لم يتم العثور.</CommandEmpty><CommandGroup>{cities.map(city => (<CommandItem value={city} key={city} onSelect={() => { form.setValue("city", city); form.setValue("district", ""); setCityOpen(false); }}> <Check className={cn("mr-2 h-4 w-4", city === field.value ? "opacity-100" : "opacity-0")} />{city}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>
                  )}/>
                   <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>الحي</FormLabel><Popover open={districtOpen} onOpenChange={setDistrictOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" disabled={!selectedCity || districts.length === 0} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? districts.find(d => d === field.value) || field.value : "اختر الحي..."}<ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="ابحث..." /><CommandList><CommandEmpty>لم يتم العثور.</CommandEmpty><CommandGroup>{districts.map(district => (<CommandItem value={district} key={district} onSelect={() => { form.setValue("district", district); setDistrictOpen(false); }}><Check className={cn("mr-2 h-4 w-4", district === field.value ? "opacity-100" : "opacity-0")} />{district}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover><FormMessage /></FormItem>
                  )}/>
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>العنوان التفصيلي</FormLabel><FormControl><Input placeholder="شارع الأمير محمد بن سعد..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>رقم هاتف الفرع (اختياري)</FormLabel><FormControl><Input placeholder="011xxxxxxx" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="latitude" render={({ field }) => ( <FormItem><FormLabel>خط العرض (Latitude)</FormLabel><FormControl><Input type="number" step="any" placeholder="24.7136" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="longitude" render={({ field }) => ( <FormItem><FormLabel>خط الطول (Longitude)</FormLabel><FormControl><Input type="number" step="any" placeholder="46.6753" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>حالة الفرع</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="active" /></FormControl><FormLabel className="font-normal">نشط</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="inactive" /></FormControl><FormLabel className="font-normal">غير نشط</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
              </form>
            </Form>
          );
      }
      return null;
  }

  const renderFooter = () => {
    if (stage === 'select') {
       return <Button type="button" variant="outline" onClick={() => { setStage('search'); setSearchResults([]); }}><ArrowLeft className="ml-2 h-4 w-4"/> الرجوع للبحث</Button>
    }
    if (stage === 'confirm') {
      return (
        <div className="w-full flex justify-between">
            <Button type="button" variant="outline" onClick={() => { setStage('search'); setSearchResults([]); }}><ArrowLeft className="ml-2 h-4 w-4"/> ابحث عن فرع آخر</Button>
            <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin" /> : (isEditing ? "حفظ التعديلات" : "إضافة الفرع")}
            </Button>
        </div>
      );
    }
    return null;
  };


  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetDialog(); setOpen(isOpen); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل فرع' : 'إضافة فرع جديد'}</DialogTitle>
          <DialogDescription>{isEditing ? 'قم بتعديل تفاصيل الفرع أدناه.' : 'ابحث عن فرعك باستخدام خرائط جوجل لتعبئة البيانات تلقائياً.'}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            {renderContent()}
        </div>
        <DialogFooter className="pt-4 border-t">
          {renderFooter()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
