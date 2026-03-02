'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  MessageSquare,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";
import StatCard from "./StatCard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { useUser } from "@/hooks/useUser";
import { db } from "@/lib/firebase";
import { collection, collectionGroup, getDocs, query, where, Timestamp } from "firebase/firestore";
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const chartConfig = {
  visitors: {
    label: "الزوار",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

type AnalyticsData = {
    totalVisitors: number;
    totalQuestions: number;
    peakHours: string;
    customerSentiment: string;
    weeklyVisitors: { day: string; visitors: number }[];
    activityHeatMap: { hour: number; activity: number }[];
}

const getSentimentFromRating = (rating: number): string => {
    if (rating >= 4.5) return "ممتاز";
    if (rating >= 4.0) return "جيد جداً";
    if (rating >= 3.0) return "جيد";
    if (rating >= 2.0) return "مقبول";
    if (rating > 0) return "سيء";
    return "لا يوجد";
}


export default function Analytics({ ...props }) {
    const { user, isLoading: isUserLoading } = useUser();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !user.restaurantId) {
          setIsLoading(false);
          setData({
            totalVisitors: 0,
            totalQuestions: 0,
            peakHours: "لا يوجد",
            customerSentiment: "لا يوجد",
            weeklyVisitors: [],
            activityHeatMap: Array.from({length: 24}, (_, i) => ({ hour: i, activity: 0 })),
          });
          return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Get sessions (visitors) and messages for chat stats
                const sessionsQuery = query(collection(db, 'restaurants', user.restaurantId!, 'ai_sessions'));
                const sessionsSnap = await getDocs(sessionsQuery);
                const sessions = sessionsSnap.docs.map(doc => {
                    const data = doc.data();
                    if (data.created_at && typeof data.created_at.toDate === 'function') {
                      return { id: doc.id, created_at: data.created_at as Timestamp };
                    }
                    return null;
                  }).filter((s): s is { id: string; created_at: Timestamp } => s !== null);

                const messagePromises = sessions.map(s => getDocs(query(collection(db, 'restaurants', user.restaurantId!, 'ai_sessions', s.id, 'messages'))));
                const messageSnaps = await Promise.all(messagePromises);
                const allMessages = messageSnaps.flatMap(snap => snap.docs.map(d => {
                    const data = d.data();
                    return { sender: data.sender || null };
                }));

                // 2. Get reviews for sentiment stats
                const reviewsQuery = query(collection(db, 'restaurants', user.restaurantId!, 'reviews'));
                const reviewsSnap = await getDocs(reviewsQuery);
                const reviews = reviewsSnap.docs.map(doc => {
                    const data = doc.data();
                    return { rating: typeof data.rating === 'number' ? data.rating : 0 };
                });

                // 3. Calculate stats
                const totalVisitors = sessions.length;
                const totalQuestions = allMessages.filter(m => m.sender === 'user').length;

                let sentiment = "لا يوجد";
                if(reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                    const averageRating = totalRating / reviews.length;
                    sentiment = getSentimentFromRating(averageRating);
                }
                
                let peakHours = "لا يوجد";
                if(sessions.length > 0) {
                    const sessionHours = sessions.map(s => s.created_at.toDate().getHours());
                    const hourCounts: { [key: number]: number } = {};
                    sessionHours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1 });
                    let peakStart = -1, maxCount = 0;
                    for(let i=0; i<24; i++){
                        if((hourCounts[i] || 0) > maxCount) {
                            maxCount = hourCounts[i] || 0;
                            peakStart = i;
                        }
                    }
                    if (peakStart !== -1) {
                        const startHour12 = peakStart % 12 || 12;
                        const startAmPm = peakStart < 12 ? 'ص' : 'م';
                        const endHour = (peakStart + 1) % 24;
                        const endHour12 = endHour % 12 || 12;
                        const endAmPm = endHour < 12 ? 'ص' : 'م';
                        peakHours = `${startHour12}${startAmPm} - ${endHour12}${endAmPm}`;
                    }
                }
                
                const activityHeatMap = Array.from({length: 24}, (_, i) => {
                    const hourCounts: { [key: number]: number } = {};
                    sessions.forEach(s => {
                        const hour = s.created_at.toDate().getHours();
                        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                    });
                    const activity = hourCounts[i] || 0;
                    return { hour: i, activity };
                });
                const maxActivity = Math.max(...activityHeatMap.map(a => a.activity));
                const normalizedHeatmap = activityHeatMap.map(a => ({...a, activity: maxActivity > 0 ? a.activity / maxActivity : 0 }));


                const today = new Date();
                const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
                const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
                const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
                
                const weeklyVisitorsData = daysOfWeek.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const visitors = sessions.filter(s => format(s.created_at.toDate(), 'yyyy-MM-dd') === dayStr).length;
                    return {
                        day: format(day, 'eee', { locale: arSA }),
                        visitors: visitors
                    };
                });


                setData({
                    totalVisitors,
                    totalQuestions,
                    peakHours,
                    customerSentiment: sentiment,
                    weeklyVisitors: weeklyVisitorsData,
                    activityHeatMap: normalizedHeatmap,
                });

            } catch (error) {
                console.error("Failed to fetch analytics data:", error);
                 setData({
                    totalVisitors: 0, totalQuestions: 0, peakHours: "خطأ", customerSentiment: "خطأ",
                    weeklyVisitors: [], activityHeatMap: Array.from({length: 24}, (_, i) => ({ hour: i, activity: 0 }))
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, isUserLoading, props.key]);

    if (isLoading || isUserLoading || !data) {
        return (
             <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                 <div className="grid gap-4 lg:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        )
    }


  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي زوار المساعد"
          value={data.totalVisitors.toString()}
          icon={Users}
          change="زائر فريد تفاعل مع المساعد"
        />
        <StatCard
          title="الأسئلة المستلمة"
          value={data.totalQuestions.toString()}
          icon={MessageSquare}
          change="رسالة من العملاء"
        />
        <StatCard
          title="أوقات الذروة"
          value={data.peakHours}
          icon={Clock}
          change="بناءً على نشاط الأسبوع"
        />
        <StatCard
          title="رضا العملاء"
          value={data.customerSentiment}
          icon={Star}
          change="بناءً على متوسط التقييمات"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">زوار هذا الأسبوع</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={data.weeklyVisitors} margin={{ top: 20, left: 0, right: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                 <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    allowDecimals={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="visitors" fill="var(--color-visitors)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">خريطة النشاط اليومي</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              الألوان الغامقة تعني نشاط أعلى للزباين خلال الساعة.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full flex flex-col">
                <div className="flex-1 min-h-0 flex flex-col justify-center">
                  <div className="grid grid-cols-12 gap-1">
                    {data.activityHeatMap.map(d => (
                        <TooltipProvider key={d.hour}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative aspect-square w-full">
                                <div 
                                    className="w-full h-full rounded-sm"
                                    style={{ 
                                        backgroundColor: `hsl(var(--primary))`,
                                        opacity: d.activity
                                    }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {d.hour}:00 - {d.hour + 1}:00
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground shrink-0">
                  <span>12ص</span>
                  <span>6ص</span>
                  <span>12م</span>
                  <span>6م</span>
                  <span>11م</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
