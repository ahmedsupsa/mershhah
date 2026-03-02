'use client';

import { useState, useEffect, useTransition } from 'react';
import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Search, 
    Zap, 
    Check, 
    Clock,
    Box,
    icons
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getTools } from '@/services/restaurant.service';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp, query, onSnapshot, getDocs, limit, where } from 'firebase/firestore';

const iconMap: { [key: string]: React.ElementType } = { ...icons, Box };

export default function ToolsStorePage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [allTools, setAllTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [installing, setInstalling] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const { toast } = useToast();

  const platformExpiryDate = subscription ? new Date(subscription.end_date.seconds * 1000).toLocaleDateString('ar-SA') : "اشتراك مرشح الأساسي";

  const fetchAllData = async () => {
    if (!user || !user.id) return;
    setIsLoading(true);
    try {
      const [toolsData, activatedToolsSnap, subscriptionSnap] = await Promise.all([
        getTools(),
        getDocs(collection(db, `profiles/${user.id}/activated_tools`)),
        getDocs(query(collection(db, `profiles/${user.id}/subscriptions`), where('status', '==', 'active'), limit(1)))
      ]);

      if (!subscriptionSnap.empty) {
        setSubscription(subscriptionSnap.docs[0].data());
      }
      
      const activatedIds = activatedToolsSnap.docs.map(doc => doc.id);
      
      const processedTools = toolsData.map(tool => ({
        ...tool,
        icon: iconMap[tool.icon] || Box,
        installed: activatedIds.includes(tool.id),
      }));
      setAllTools(processedTools);
    } catch (error) {
      console.error("Failed to fetch tools", error);
      toast({ title: "فشل تحميل الأدوات", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if(!isUserLoading && user) {
        fetchAllData();
    }
  }, [isUserLoading, user]);

  const filteredTools = allTools.filter(tool => 
    tool.title.includes(searchQuery) || tool.description.includes(searchQuery)
  );

  const processFreeInstallation = (toolId: string) => {
    if (!user || !user.id) return;
    setInstalling(toolId);

    setTimeout(async () => {
        try {
            const toolRef = doc(db, `profiles/${user.id}/activated_tools`, toolId);
            await setDoc(toolRef, {
                tool_id: toolId,
                activated_at: serverTimestamp(),
                expires_at: subscription?.end_date || null
            });
            toast({ title: "تم تفعيل الأداة بنجاح", description: `الأداة صالحة حتى ${platformExpiryDate}` });
            await fetchAllData();
        } catch(error: any) {
            toast({ title: "خطأ في التفعيل", description: error.message, variant: "destructive" });
        } finally {
            setInstalling(null);
        }
    }, 1500);
  };


  const handleInstallClick = (tool: any) => {
    toast({
        title: "نظام التفعيل قيد الصيانة",
        description: "نقوم حالياً بتحديث نظام التفعيل. يرجى المحاولة مرة أخرى لاحقاً.",
    });
  };
  
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
        {Array.from({length: 3}).map((_, index) => (
            <Card key={index} className="h-full flex flex-col">
                 <CardHeader className="p-6 items-center text-center">
                    <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent className="p-6 flex-1">
                    <Skeleton className="h-16 w-full" />
                </CardContent>
                <CardFooter className="p-4 border-t flex-col gap-4">
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        ))}
    </div>
  )

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="متجر الأدوات"
        description="تصفح وفعل أدوات إضافية لتنمية مشروعك. تنتهي صلاحية الأدوات مع اشتراك مرشح الأساسي."
      >
        <div className="relative w-full max-w-sm me-auto">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="ابحث عن أداة..." 
                className="pe-9 text-right"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </PageHeader>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800">
        <Clock className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
            تنبيه: جميع الأدوات المفعلة ستكون صالحة حتى انتهاء اشتراكك في <span className="font-bold underline">{platformExpiryDate}</span>.
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="flex flex-row-reverse w-full justify-start gap-2">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="marketing">التسويق</TabsTrigger>
          <TabsTrigger value="operations">العمليات</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        {isLoading || isUserLoading ? renderSkeletons() : 
          ['all', 'marketing', 'operations', 'analytics'].map((tab) => (
            <TabsContent key={tab} value={tab} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
                {filteredTools
                    .filter(t => tab === 'all' || t.category === tab)
                    .map((tool, index) => {
                        const IconComponent = tool.icon;
                        return (
                          <motion.div
                            key={tool.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <Card className="h-full flex flex-col text-center hover:shadow-lg transition-shadow duration-300 group overflow-hidden border-2 border-transparent hover:border-primary">
                                <CardHeader className={`p-6 ${tool.bg_color} flex-col items-center`}>
                                    <div className={`w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 border-2 border-white/30`}>
                                        <IconComponent className={`h-8 w-8 ${tool.color}`} />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-foreground">{tool.title}</CardTitle>
                                    {tool.popular && (
                                        <Badge variant="secondary" className="mt-2 bg-amber-400 text-amber-900 font-bold">الأكثر شيوعاً</Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="p-6 flex-1">
                                    <CardDescription className="line-clamp-3 h-16">{tool.description}</CardDescription>
                                </CardContent>
                                <CardFooter className="p-4 border-t flex-col gap-4">
                                    <div className="flex items-baseline justify-center gap-2">
                                        <span className="text-2xl font-black text-foreground">{tool.price_label}</span>
                                    </div>
                                    {tool.installed ? (
                                        <Button variant="outline" className="w-full gap-2 border-green-200 text-green-700" disabled>
                                            <Check className="h-4 w-4" />
                                            <span>تم التفعيل</span>
                                        </Button>
                                    ) : (
                                        <Button 
                                            className="w-full gap-2"
                                            onClick={() => handleInstallClick(tool)}
                                            disabled={!!installing}
                                        >
                                            {installing === tool.id ? <Loader2 className="animate-spin h-4 w-4" /> : <Zap className="h-4 w-4" />}
                                            <span>{installing === tool.id ? 'جاري التفعيل...' : 'تفعيل الأداة'}</span>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                          </motion.div>
                        )
                    })}
                </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
