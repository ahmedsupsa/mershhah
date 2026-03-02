
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizonal, ArrowRight, User as UserIcon, Paperclip, Loader2, FileIcon, ChevronLeft, MessageSquare, Download } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChatMessage, ChatSession, Profile } from '@/lib/types';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { db, storage } from '@/lib/firebase';
import { doc, collection, query, orderBy, onSnapshot, serverTimestamp, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const getInitials = (name?: string | null) => {
  if (!name) return 'A';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function AdminChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { user: adminUser } = useUser();
  const { toast } = useToast();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const adminName = 'الدعم الفني'; 

  useEffect(() => {
    if (!chatId) return;

    const setupChat = () => {
        setIsLoading(true);

        const chatDocRef = doc(db, "chats", chatId);
        const profileDocRef = doc(db, 'profiles', chatId);

        getDoc(profileDocRef).then(profileSnap => {
            if (profileSnap.exists()) {
                setOwnerProfile({ id: profileSnap.id, ...profileSnap.data() } as Profile);
            }
        }).catch(error => console.error("Error fetching owner profile:", error));

        const sessionUnsub = onSnapshot(chatDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const sessionData = { id: docSnap.id, ...docSnap.data() } as ChatSession;
                setSession(sessionData);
                if (docSnap.data().adminHasUnread) {
                    setDoc(docSnap.ref, { adminHasUnread: false }, { merge: true });
                }
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching session:", error);
            setIsLoading(false);
        });

        const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
        const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
            const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
            setMessages(fetchedMessages);
        });
        
        return () => {
            sessionUnsub();
            messagesUnsub();
        };
    };

    const unsubscribe = setupChat();
    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: FormEvent, file?: File) => {
    e.preventDefault();
    if ((message.trim() === '' && !file) || !chatId || !adminUser || (!session && !ownerProfile)) return;
    
    const messageText = message;
    setMessage('');
    setIsUploading(true);

    let attachmentData: Partial<ChatMessage> = {};

    try {
        if (file) {
            const storageRef = ref(storage, `chat_attachments/${chatId}/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            attachmentData = {
                attachment_url: downloadUrl,
                attachment_filename: file.name,
                attachment_type: file.type.startsWith('image/') ? 'image' : 'file'
            };
        }

        const messagesCol = collection(db, "chats", chatId, "messages");
        await addDoc(messagesCol, {
            text: messageText,
            senderId: adminUser.uid,
            senderRole: 'admin',
            timestamp: serverTimestamp(),
            ...attachmentData,
        });

        const chatDoc = doc(db, "chats", chatId);
        await setDoc(chatDoc, {
            lastMessage: file ? `ملف: ${file.name}` : messageText,
            lastMessageTimestamp: serverTimestamp(),
            ownerHasUnread: true,
            adminHasUnread: false,
            ownerName: session?.ownerName || ownerProfile?.restaurant_name || ownerProfile?.full_name,
            ownerLogo: session?.ownerLogo || null
        }, { merge: true });

    } catch (error: any) {
        toast({ title: 'خطأ في الإرسال', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({ title: "حجم الملف كبير جداً", description: "الرجاء اختيار ملف أصغر من 5 ميجابايت.", variant: "destructive" });
            return;
        }
        handleSendMessage(e, file);
    }
  };

  const pageTitleName = session?.ownerName || ownerProfile?.restaurant_name || ownerProfile?.full_name || '...';

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-4 border-b p-4 shrink-0">
         <Avatar className="h-10 w-10 border">
            <AvatarFallback className="bg-muted text-foreground font-bold">
              {getInitials(session?.ownerName || ownerProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
        <div>
            <h2 className="text-lg font-semibold">{pageTitleName}</h2>
            <p className="text-sm text-muted-foreground">صاحب مطعم</p>
        </div>
      </header>

      <div className="flex-1 relative">
        <div className="absolute inset-0 overflow-y-auto p-6 space-y-4">
            {isLoading && (
            <div className="space-y-4">
                <Skeleton className="h-16 w-3/4 rounded-lg" />
                <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
                <Skeleton className="h-12 w-1/2 rounded-lg" />
            </div>
            )}
            {!isLoading && messages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                <div
                    key={msg.id}
                    className={`flex items-end gap-3 ${
                    isAdmin ? 'justify-end' : 'justify-start'
                    }`}
                >
                    {!isAdmin && (
                    <Avatar className="h-8 w-8 shrink-0 self-end">
                        <AvatarFallback className="bg-muted text-foreground">
                        {getInitials(session?.ownerName || ownerProfile?.full_name)}
                        </AvatarFallback>
                    </Avatar>
                    )}
                    
                    <div className={`p-3 text-sm rounded-2xl max-w-[70%] relative ${
                        isAdmin ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'
                    }`}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.attachment_url && (
                            <div className="mt-2">
                                {msg.attachment_type === 'image' ? (
                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                        <Image src={msg.attachment_url} alt={msg.attachment_filename || 'Attachment'} width={200} height={200} className="rounded-md object-cover cursor-pointer"/>
                                    </a>
                                ) : (
                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-2.5 rounded-lg ${isAdmin ? 'bg-primary-foreground/10 text-primary-foreground' : 'bg-background/50 text-foreground'} hover:bg-background/70`}>
                                        <FileIcon className="h-6 w-6" />
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold underline truncate">{msg.attachment_filename || 'تنزيل الملف'}</p>
                                            <p className="text-xs opacity-70">ملف</p>
                                        </div>
                                        <Download className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                    <Avatar className="h-8 w-8 shrink-0 self-end">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(adminName)}
                        </AvatarFallback>
                    </Avatar>
                    )}
                </div>
                )
            })}
            {!isLoading && messages.length === 0 && (
                <p className="text-center text-muted-foreground pt-10">لا توجد رسائل في هذه المحادثة. ابدأ الحوار!</p>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>


      <footer className="border-t p-4 shrink-0">
        <form
            onSubmit={(e) => handleSendMessage(e)}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="pr-12 h-11"
                disabled={isLoading || isUploading}
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isUploading}>
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </Button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button type="submit" size="icon" className="h-11 w-11" disabled={isLoading || (!message.trim() && !isUploading)}>
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </form>
      </footer>
    </div>
  );
}
