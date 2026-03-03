"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SendHorizonal, Bot, User, ChevronRight, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, addDoc, serverTimestamp, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import type { Restaurant, AiMessage, MenuItem, Offer } from '@/lib/types';
import { restaurantChat } from '@/ai/flows/restaurant-chat-flow';
import Link from 'next/link';
import { StorageImage } from '@/components/shared/StorageImage';
import { cn } from '@/lib/utils';

export default function AiAssistantPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let sid = localStorage.getItem(`mershah-session-${username}`);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(`mershah-session-${username}`, sid);
    }
    setSessionId(sid);
  }, [username]);

  useEffect(() => {
    if (!username || !sessionId) return;

    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "restaurants"), where("username", "==", username), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          notFound();
          return;
        } else {
          const restDoc = querySnapshot.docs[0];
          const restData = { id: restDoc.id, ...restDoc.data() } as Restaurant;
          setRestaurant(restData);

          const menuQuery = collection(db, 'restaurants', restDoc.id, 'menu_items');
          const offersQuery = collection(db, 'restaurants', restDoc.id, 'offers');
          const [menuSnap, offersSnap] = await Promise.all([
            getDocs(menuQuery),
            getDocs(offersQuery)
          ]);
          
          setMenuItems(menuSnap.docs.map(d => d.data() as MenuItem));
          setOffers(offersSnap.docs.map(d => d.data() as Offer));

          setMessages([
            { 
              id: '1', 
              sender: 'bot', 
              text: "أنا رفيقك الذكي. كيف أقدر أساعدك اليوم؟", 
              timestamp: new Date() 
            }
          ]);
        }
      } catch (error) {
        console.error("Error fetching restaurant data", error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [username, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || !restaurant) return;

    const userMsgContent = input;
    const userMsg: AiMessage = { id: Date.now().toString(), sender: 'user', text: userMsgContent, timestamp: new Date(), session_id: sessionId };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const messagesColRef = collection(db, 'restaurants', restaurant.id, 'ai_sessions', sessionId, 'messages');
      await addDoc(messagesColRef, { sender: 'user', text: userMsgContent, timestamp: serverTimestamp() });

      const restaurantContextData = {
          name: restaurant.name,
          menu: menuItems.map(i => ({ name: i.name, price: i.sizes?.[0]?.price })),
          offers: offers.map(o => ({ title: o.title })),
      };

      const aiResponse = await restaurantChat({
        customerMessage: userMsgContent,
        restaurantData: JSON.stringify(restaurantContextData)
      });

      const botMsg: AiMessage = { id: (Date.now() + 1).toString(), sender: 'bot', text: aiResponse.smartReply, timestamp: new Date(), session_id: sessionId };
      await addDoc(messagesColRef, { sender: 'bot', text: aiResponse.smartReply, timestamp: serverTimestamp() });
      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
        setMessages(prev => [...prev, { id: 'err', sender: 'bot', text: 'حدث خطأ فني...', timestamp: new Date() }]);
    } finally {
        setIsTyping(false);
    }
  };

  if (loading || !restaurant) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  
  // المساعد الذكي للعملاء متاح فقط في الباقات المدفوعة
  if (!restaurant.is_paid_plan) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg p-8 text-center space-y-4 border border-gray-100">
          <h1 className="text-xl font-black">المساعد الذكي متاح في الباقات المدفوعة</h1>
          <p className="text-sm text-muted-foreground">
            لتفعيل المساعد الذكي لعملائك، قم بترقية باقتك من لوحة التحكم في مرشح.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = restaurant.primaryColor || '#e11d48';

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden" dir="rtl">
      <header className="px-6 py-4 bg-white shadow-sm border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-[-8px]">
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-3">
             <Avatar className="h-10 w-10 border-2 overflow-hidden" style={{ borderColor: primaryColor }}>
                <StorageImage imagePath={restaurant.logo} alt={restaurant.name} fill className="object-cover" sizes="40px" />
                <AvatarFallback>{restaurant.name[0]}</AvatarFallback>
            </Avatar>
            <div className="text-right">
                <h1 className="text-base font-bold leading-tight">{restaurant.name}</h1>
                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    متصل ذكياً
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white/80 backdrop-blur-md px-4 py-2 flex gap-2 overflow-x-auto border-b no-scrollbar">
          <Link href={`/menu/${username}`}>
            <Button variant="outline" size="sm" className="rounded-full shrink-0 gap-2 text-xs">
                <Utensils className="h-3.5 w-3.5" style={{ color: primaryColor }} />
                قائمة الطعام
            </Button>
          </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
                <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn("flex", msg.sender === 'user' ? "justify-end" : "justify-start")}
                >
                    <div className={cn("flex gap-2 max-w-[85%]", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}>
                        <Avatar className="h-8 w-8 shrink-0 mt-1 border overflow-hidden">
                            {msg.sender === 'bot' ? (
                                <div className="w-full h-full relative" style={{ backgroundColor: primaryColor }}>
                                    <StorageImage imagePath={restaurant.logo} alt={restaurant.name} fill className="object-cover" sizes="32px" />
                                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center"><Bot className="h-4 w-4 text-white opacity-50" /></div>
                                </div>
                            ) : (
                                <AvatarFallback className="bg-gray-200"><User className="h-4 w-4 text-gray-500" /></AvatarFallback>
                            )}
                        </Avatar>
                        <div 
                            className={cn(
                                "px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                                msg.sender === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-white text-gray-800 border',
                                msg.sender === 'user' ? "rounded-tr-none" : "rounded-tl-none"
                            )}
                            style={msg.sender === 'user' ? { backgroundColor: primaryColor } : {}}
                        >
                            {msg.text}
                        </div>
                    </div>
                </motion.div>
            ))}
          </AnimatePresence>
          
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                 <div className="flex gap-2 items-center bg-white border px-4 py-3 rounded-2xl shadow-sm">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                 </div>
            </motion.div>
          )}
      </div>

      <footer className="p-4 bg-white border-t pb-8">
          <div className="max-w-4xl mx-auto flex gap-2 items-center">
              <div className="relative flex-1">
                <Input 
                    placeholder="اسأل عن أي شيء ببالك..."
                    className="h-12 rounded-full border-gray-200 focus-visible:ring-offset-0 focus-visible:ring-1 pr-4 pl-12"
                    style={{ '--tw-ring-color': primaryColor } as any}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button 
                    size="icon" 
                    className="absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-full shadow-md left-1.5"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                >
                    <SendHorizonal className="h-5 w-5" />
                </Button>
              </div>
          </div>
      </footer>
    </div>
  );
}
