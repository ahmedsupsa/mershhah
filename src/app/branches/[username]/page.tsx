
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Navigation, Phone, Clock, Search, Building2, LocateFixed, Loader2, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import type { Branch, Restaurant } from '@/lib/types';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type CityFilter = {
    name: string;
    districts: string[];
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}

export default function PublicBranchesPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cities, setCities] = useState<CityFilter[]>([]);
  const [loading, setLoading] = useState(true);

  // Search/Filter State
  const [selectedCity, setSelectedCity] = useState<string>("الكل");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("الكل");
  const [cityOpen, setCityOpen] = useState(false);
  const [districtOpen, setDistrictOpen] = useState(false);


  // Geolocation State
  const [nearestBranch, setNearestBranch] = useState<{ branch: Branch, distance: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);

    const restQuery = query(collection(db, "restaurants"), where("username", "==", username), limit(1));
    const restUnsub = onSnapshot(restQuery, (restSnapshot) => {
        if (restSnapshot.empty) {
            setRestaurant(null);
            setLoading(false);
        } else {
            const restDoc = restSnapshot.docs[0];
            const restData = { id: restDoc.id, ...restDoc.data() } as Restaurant;
            setRestaurant(restData);
            
            const branchQuery = query(collection(db, "restaurants", restDoc.id, "branches"));
            const branchUnsub = onSnapshot(branchQuery, (branchSnapshot) => {
                const branchData = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
                setBranches(branchData || []);
                const uniqueCities = [...new Set(branchData.map(b => b.city))].map(city => {
                    const districtsForCity = [...new Set(branchData.filter(b => b.city === city).map(b => b.district))];
                    return { name: city, districts: districtsForCity };
                });
                setCities(uniqueCities);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching branches:", error);
                setLoading(false);
            });
            return branchUnsub;
        }
    }, (error) => {
        console.error("Error fetching restaurant:", error);
        setLoading(false);
    });

    return () => restUnsub();

  }, [username]);

  const handleFindNearest = () => {
    if (!navigator.geolocation) {
        setLocationError("المتصفح لا يدعم تحديد الموقع.");
        toast({ title: "خطأ", description: "المتصفح لا يدعم تحديد الموقع.", variant: "destructive" });
        return;
    }

    setIsLocating(true);
    setLocationError(null);
    setNearestBranch(null);

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            const branchesWithCoords = branches.filter(b => b.latitude && b.longitude);
            if (branchesWithCoords.length === 0) {
                 setLocationError("لا توجد إحداثيات للفروع.");
                 setIsLocating(false);
                 return;
            }

            let closestBranch: Branch | null = null;
            let minDistance = Infinity;

            branchesWithCoords.forEach(branch => {
                const distance = getDistance(latitude, longitude, branch.latitude!, branch.longitude!);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestBranch = branch;
                }
            });

            if (closestBranch) {
                setNearestBranch({ branch: closestBranch, distance: minDistance });
            }
            setIsLocating(false);
        },
        (error) => {
            let message = "فشل تحديد الموقع.";
            if (error.code === 1) message = "تم رفض إذن الوصول للموقع.";
            setLocationError(message);
            toast({ title: "خطأ", description: message, variant: "destructive" });
            setIsLocating(false);
        }
    );
  };


  const filteredBranches = branches.filter(b => {
      if (b.status !== 'active') return false;
      const cityMatch = selectedCity === "الكل" || b.city === selectedCity;
      const districtMatch = selectedDistrict === "الكل" || b.district === selectedDistrict;
      return cityMatch && districtMatch;
  });

  const currentDistricts = cities.find(c => c.name === selectedCity)?.districts || [];

  if (loading) return <div className="h-screen flex items-center justify-center">جاري تحميل الفروع...</div>;

  if (!restaurant) return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-center p-4">
        <div>
            <h1 className="text-xl font-bold">عذراً, المطعم غير موجود</h1>
            <p className="text-muted-foreground mt-2">قد يكون الرابط الذي تتبعه غير صحيح, أو أن المطعم لم يقم بإعداد صفحته بعد.</p>
        </div>
    </div>
  );

  const primaryColor = restaurant?.primaryColor || '#e11d48';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-10" style={{ fontFamily: 'Cairo, sans-serif' }}>
      <header className="p-6 bg-white border-b sticky top-0 z-10 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ChevronRight className="h-6 w-6" /></Button>
        <h1 className="text-xl font-black">فروعنا</h1>
      </header>

      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
          <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shrink-0 border border-primary/10 shadow-sm">
                      <LocateFixed className="h-8 w-8 text-primary" style={{ color: primaryColor }} />
                  </div>
                  <div className="flex-1 text-center sm:text-right">
                      <h2 className="font-bold text-lg">هل تبحث عن أقرب فرع؟</h2>
                      <p className="text-sm text-muted-foreground">اسمح لنا بتحديد موقعك لعرض أقرب فرع لك.</p>
                  </div>
                  <Button onClick={handleFindNearest} disabled={isLocating} className="w-full sm:w-auto mt-2 sm:mt-0" style={{ backgroundColor: primaryColor }}>
                      {isLocating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <MapPin className="h-4 w-4 ml-2" />}
                      {isLocating ? 'جاري التحديد...' : 'حدد أقرب فرع'}
                  </Button>
              </CardContent>
          </Card>
          
          {locationError && <div className="text-center text-sm text-red-500 flex items-center justify-center gap-2"><AlertCircle className="h-4 w-4" />{locationError}</div>}

          {nearestBranch && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-2 border-green-500 bg-green-50">
                      <CardContent className="p-4">
                          <h3 className="text-sm font-semibold text-green-800">الأقرب إليك:</h3>
                           <div className="flex justify-between items-center mt-2">
                               <div>
                                   <p className="font-bold text-lg">{nearestBranch.branch.name}</p>
                                   <p className="text-sm text-green-700">{nearestBranch.distance.toFixed(1)} كم تقريباً</p>
                               </div>
                               {nearestBranch.branch.google_maps_url && <Button asChild size="sm" variant="outline"><Link href={nearestBranch.branch.google_maps_url} target="_blank">افتح الخريطة</Link></Button>}
                           </div>
                      </CardContent>
                  </Card>
              </motion.div>
          )}

          <Card className="border-0 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-primary" style={{ color: primaryColor }} />
                      <h2 className="text-sm font-bold">أو ابحث عن فرع في منطقتك</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-black opacity-50">المدينة</Label>
                          <Popover open={cityOpen} onOpenChange={setCityOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={cityOpen} className="w-full justify-between rounded-xl h-12 bg-gray-50 border-gray-100">
                                {selectedCity === "الكل" ? "اختر مدينة..." : selectedCity}
                                <ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="ابحث عن مدينة..." />
                                <CommandList>
                                <CommandEmpty>لا توجد مدينة بهذا الاسم.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="الكل" onSelect={() => { setSelectedCity("الكل"); setSelectedDistrict("الكل"); setCityOpen(false); }}>الكل</CommandItem>
                                  {cities.map(c => <CommandItem key={c.name} value={c.name} onSelect={() => { setSelectedCity(c.name); setSelectedDistrict("الكل"); setCityOpen(false); }}>{c.name}</CommandItem>)}
                                </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                      </div>
                      <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-black opacity-50">الحي</Label>
                           <Popover open={districtOpen} onOpenChange={setDistrictOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" aria-expanded={districtOpen} disabled={selectedCity === "الكل" || currentDistricts.length === 0} className="w-full justify-between rounded-xl h-12 bg-gray-50 border-gray-100">
                                {selectedDistrict === "الكل" ? "اختر الحي..." : selectedDistrict}
                                <ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder="ابحث عن حي..." />
                                <CommandList>
                                <CommandEmpty>لا يوجد حي بهذا الاسم.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="الكل" onSelect={() => { setSelectedDistrict("الكل"); setDistrictOpen(false); }}>الكل</CommandItem>
                                  {currentDistricts.map(d => <CommandItem key={d} value={d} onSelect={() => { setSelectedDistrict(d); setDistrictOpen(false); }}>{d}</CommandItem>)}
                                </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">الفروع المتاحة ({filteredBranches.length})</h3>
              </div>

              <AnimatePresence mode="popLayout">
                {filteredBranches.map((branch, index) => (
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={branch.id}
                    >
                        <Card className="border-0 shadow-sm overflow-hidden group">
                            <CardContent className="p-0">
                                <div className="p-5 flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-primary/5 transition-colors">
                                        <Building2 className="h-6 w-6 text-gray-400 group-hover:text-primary transition-colors" style={{ color: index === 0 ? primaryColor : undefined }} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-black text-lg">{branch.name}</h4>
                                            <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-black uppercase border border-green-100">نشط</div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                                            <MapPin className="h-3 w-3" />
                                            {branch.city}, {branch.district}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-2 opacity-80">{branch.address}</p>
                                        
                                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
                                            {branch.google_maps_url && (
                                                <Link href={branch.google_maps_url} target='_blank'>
                                                    <Button variant="ghost" size="sm" className="h-9 px-4 rounded-full gap-2 text-xs font-bold hover:bg-primary/10 transition-colors" style={{ color: primaryColor }}>
                                                        <Navigation className="h-3.5 w-3.5" />
                                                        فتح في جوجل ماب
                                                    </Button>
                                                </Link>
                                            )}
                                            {branch.phone && (
                                                 <a href={`tel:${branch.phone}`}>
                                                    <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0">
                                                        <Phone className="h-4 w-4 opacity-60" />
                                                    </Button>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
              </AnimatePresence>

              {filteredBranches.length === 0 && (
                  <div className="py-20 text-center space-y-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                        <MapPin className="h-8 w-8 text-gray-300" />
                      </div>
                      <p className="font-bold text-gray-400">عذراً، لا يوجد فرع في هذا الحي حالياً.</p>
                      <Button variant="link" onClick={() => { setSelectedCity("الكل"); setSelectedDistrict("الكل"); }}>إظهار جميع الفروع</Button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
