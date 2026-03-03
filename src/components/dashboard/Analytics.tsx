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
import { arSA, enUS } from 'date-fns/locale';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useLanguage } from "@/components/shared/LanguageContext";

type AnalyticsData = {
    totalVisitors: number;
    totalQuestions: number;
    peakStartHour: number | null;
    averageRating: number | null;
    weeklyVisitors: { date: Date; visitors: number }[];
    activityHeatMap: { hour: number; activity: number }[];
}

const getSentimentFromRating = (rating: number, isRTL: boolean): string => {
    if (rating >= 4.5) return isRTL ? "ممتاز" : "Excellent";
    if (rating >= 4.0) return isRTL ? "جيد جداً" : "Very Good";
    if (rating >= 3.0) return isRTL ? "جيد" : "Good";
    if (rating >= 2.0) return isRTL ? "مقبول" : "Fair";
    if (rating > 0) return isRTL ? "سيء" : "Poor";
    return isRTL ? "لا يوجد" : "N/A";
}


export default function Analytics({ ...props }) {
    const { user, isLoading: isUserLoading } = useUser();
    const { locale } = useLanguage();
    const isRTL = locale === 'ar';
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const chartConfig = {
      visitors: {
        label: isRTL ? "الزوار" : "Visitors",
        color: "hsl(var(--primary))",
      },
    } satisfies ChartConfig;

    useEffect(() => {
        if (isUserLoading) return;
        if (!user || !user.restaurantId) {
          setIsLoading(false);
          setData({
            totalVisitors: 0,
            totalQuestions: 0,
            peakStartHour: null,
            averageRating: null,
            weeklyVisitors: [],
            activityHeatMap: Array.from({length: 24}, (_, i) => ({ hour: i, activity: 0 })),
          });
          return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 1. Get assistant sessions (المساعد الذكي) لقياس التفاعل عبر الشات
                const sessionsQuery = query(collection(db, 'restaurants', user.restaurantId!, 'ai_sessions'));
                const sessionsSnap = await getDocs(sessionsQuery);
                const assistantSessions = sessionsSnap.docs.map(doc => {
                    const data = doc.data();
                    if (data.created_at && typeof data.created_at.toDate === 'function') {
                      return { id: doc.id, created_at: data.created_at as Timestamp };
                    }
                    return null;
                  }).filter((s): s is { id: string; created_at: Timestamp } => s !== null);

                const messagePromises = assistantSessions.map(s => getDocs(query(collection(db, 'restaurants', user.restaurantId!, 'ai_sessions', s.id, 'messages'))));
                const messageSnaps = await Promise.all(messagePromises);
                const allMessages = messageSnaps.flatMap(snap => snap.docs.map(d => {
                    const data = d.data();
                    return { sender: data.sender || null };
                }));

                // 2. Get hub visits (أي زيارة للروابط العامة مثل الهب/المنيو)
                const hubVisitsQuery = query(collection(db, 'restaurants', user.restaurantId!, 'hub_visits'));
                const hubVisitsSnap = await getDocs(hubVisitsQuery);
                const hubVisits = hubVisitsSnap.docs.map(doc => {
                    const data = doc.data();
                    if (data.timestamp && typeof (data.timestamp as any).toDate === 'function') {
                        return { created_at: data.timestamp as Timestamp };
                    }
                    return null;
                }).filter((v): v is { created_at: Timestamp } => v !== null);

                // 3. Get reviews for sentiment stats
                const reviewsQuery = query(collection(db, 'restaurants', user.restaurantId!, 'reviews'));
                const reviewsSnap = await getDocs(reviewsQuery);
                const reviews = reviewsSnap.docs.map(doc => {
                    const data = doc.data();
                    return { rating: typeof data.rating === 'number' ? data.rating : 0 };
                });

                // دمج جميع الأحداث التي تمثل "زيارة" أو "جلسة" (مساعد + زيارات الهب/الرابط)
                const allEventTimestamps: Timestamp[] = [
                    ...assistantSessions.map(s => s.created_at),
                    ...hubVisits.map(v => v.created_at),
                ];

                // 4. Calculate stats
                const totalVisitors = allEventTimestamps.length;
                const totalQuestions = allMessages.filter(m => m.sender === 'user').length;

                let avgRating: number | null = null;
                if(reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
                    avgRating = totalRating / reviews.length;
                }
                
                let peakStartHour: number | null = null;
                if(allEventTimestamps.length > 0) {
                    const hours = allEventTimestamps.map(ts => ts.toDate().getHours());
                    const hourCounts: { [key: number]: number } = {};
                    hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1 });
                    let peakStart = -1, maxCount = 0;
                    for(let i=0; i<24; i++){
                        if((hourCounts[i] || 0) > maxCount) {
                            maxCount = hourCounts[i] || 0;
                            peakStart = i;
                        }
                    }
                    if (peakStart !== -1) {
                        peakStartHour = peakStart;
                    }
                }
                
                const activityHeatMap = Array.from({length: 24}, (_, i) => {
                    const hourCounts: { [key: number]: number } = {};
                    allEventTimestamps.forEach(ts => {
                        const hour = ts.toDate().getHours();
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
                    const visitors = allEventTimestamps.filter(ts => format(ts.toDate(), 'yyyy-MM-dd') === dayStr).length;
                    return {
                        date: day,
                        visitors: visitors
                    };
                });


                setData({
                    totalVisitors,
                    totalQuestions,
                    peakStartHour: peakStartHour,
                    averageRating: avgRating,
                    weeklyVisitors: weeklyVisitorsData,
                    activityHeatMap: normalizedHeatmap,
                });

            } catch (error) {
                console.error("Failed to fetch analytics data:", error);
                 setData({
                    totalVisitors: 0, totalQuestions: 0, 
                    peakStartHour: null, 
                    averageRating: null,
                    weeklyVisitors: [], activityHeatMap: Array.from({length: 24}, (_, i) => ({ hour: i, activity: 0 }))
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user, isUserLoading, props.key]);

    const formatPeakHours = (peakStart: number | null): string => {
        if (peakStart === null) return isRTL ? "لا يوجد" : "N/A";
        const startHour12 = peakStart % 12 || 12;
        const startAmPm = peakStart < 12 ? (isRTL ? 'ص' : 'AM') : (isRTL ? 'م' : 'PM');
        const endHour = (peakStart + 1) % 24;
        const endHour12 = endHour % 12 || 12;
        const endAmPm = endHour < 12 ? (isRTL ? 'ص' : 'AM') : (isRTL ? 'م' : 'PM');
        return `${startHour12}${startAmPm} - ${endHour12}${endAmPm}`;
    };

    const formatSentiment = (rating: number | null): string => {
        if (rating === null) return isRTL ? "لا يوجد" : "N/A";
        return getSentimentFromRating(rating, isRTL);
    };

    const formatWeeklyData = () => {
        return data?.weeklyVisitors.map(item => ({
            day: format(item.date, 'eee', { locale: isRTL ? arSA : enUS }),
            visitors: item.visitors
        })) || [];
    };

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
          title={isRTL ? "إجمالي زوار المساعد" : "Total Assistant Visitors"}
          value={data.totalVisitors.toString()}
          icon={Users}
          change={isRTL ? "زائر فريد تفاعل مع المساعد" : "unique visitors interacted with assistant"}
        />
        <StatCard
          title={isRTL ? "الأسئلة المستلمة" : "Questions Received"}
          value={data.totalQuestions.toString()}
          icon={MessageSquare}
          change={isRTL ? "رسالة من العملاء" : "messages from customers"}
        />
        <StatCard
          title={isRTL ? "أوقات الذروة" : "Peak Hours"}
          value={formatPeakHours(data.peakStartHour)}
          icon={Clock}
          change={isRTL ? "بناءً على نشاط الأسبوع" : "based on weekly activity"}
        />
        <StatCard
          title={isRTL ? "رضا العملاء" : "Customer Satisfaction"}
          value={formatSentiment(data.averageRating)}
          icon={Star}
          change={isRTL ? "بناءً على متوسط التقييمات" : "based on average ratings"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">
              {isRTL ? "زوار هذا الأسبوع" : "This Week's Visitors"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={formatWeeklyData()} margin={{ top: 20, left: 0, right: -20, bottom: 5 }}>
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
            <CardTitle className="font-headline">
              {isRTL ? "خريطة النشاط اليومي" : "Daily Activity Map"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL 
                ? "الألوان الغامقة تعني نشاط أعلى للزباين خلال الساعة."
                : "Darker colors indicate higher customer activity during that hour."}
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
                  <span>{isRTL ? "12ص" : "12AM"}</span>
                  <span>{isRTL ? "6ص" : "6AM"}</span>
                  <span>{isRTL ? "12م" : "12PM"}</span>
                  <span>{isRTL ? "6م" : "6PM"}</span>
                  <span>{isRTL ? "11م" : "11PM"}</span>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
