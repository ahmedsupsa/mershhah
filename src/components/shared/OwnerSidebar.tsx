'use client';

import { usePathname, useRouter } from "next/navigation";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Utensils,
  Megaphone,
  Palette,
  LogOut,
  Settings,
  MessageSquare,
  Ticket,
  Store,
  ChevronDown,
  Box,
  icons,
  Star,
  Building2,
  BarChart3,
  GalleryHorizontal,
} from "lucide-react";
import { Logo } from "./Logo";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { LanguageSwitcherSimple } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageContext";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { collection, getDocs } from "firebase/firestore";
import { SidebarMenuSkeleton } from "../ui/sidebar";

const iconMap: { [key: string]: React.ElementType } = { ...icons, Box };

export function OwnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { locale } = useLanguage();
  const isRTL = locale === 'ar';
  const [isToolsOpen, setIsToolsOpen] = useState(true);
  
  const [activatedTools, setActivatedTools] = useState<any[]>([]);
  const [isLoadingTools, setIsLoadingTools] = useState(true);

  const menuItems = [
    { href: "/owner/dashboard", label: isRTL ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard },
    { href: "/owner/menu", label: isRTL ? "إدارة المنيو" : "Menu Management", icon: Utensils },
    { href: "/owner/pricing", label: isRTL ? "مركز التقارير" : "Reports Center", icon: BarChart3 },
    { href: "/owner/offers", label: isRTL ? "إدارة العروض" : "Offers Management", icon: Megaphone },
    { href: "/owner/reviews", label: isRTL ? "التقييمات" : "Reviews", icon: Star },
    { href: "/owner/branches", label: isRTL ? "إدارة الفروع" : "Branch Management", icon: Building2 },
    { href: "/owner/customize", label: isRTL ? "تخصيص الواجهة" : "Customize Interface", icon: Palette },
    { href: "/owner/studio", label: isRTL ? "الاستوديو" : "Studio", icon: GalleryHorizontal },
    { href: "/owner/store", label: isRTL ? "متجر الأدوات" : "Tools Store", icon: Store },
  ];

  const supportItems = [
    { href: "/owner/support", label: isRTL ? "الدعم المباشر" : "Live Support", icon: MessageSquare },
    { href: "/owner/tickets", label: isRTL ? "تذاكر الدعم" : "Support Tickets", icon: Ticket },
  ];

  useEffect(() => {
    const fetchTools = async () => {
      if (!user?.id) {
        setIsLoadingTools(false);
        return;
      }
      setIsLoadingTools(true);
      try {
        const allToolsSnap = await getDocs(collection(db, 'tools'));
        const allToolsMap = new Map(allToolsSnap.docs.map(doc => [doc.id, { ...doc.data(), id: doc.id }]));
        
        const activatedToolsSnap = await getDocs(collection(db, `profiles/${user.id}/activated_tools`));
        
        const userTools = activatedToolsSnap.docs.map(doc => {
            const toolDetails = allToolsMap.get(doc.id);
            if (!toolDetails) return null;
            
            const IconComponent = iconMap[toolDetails.icon as string] || Box;

            return {
                id: doc.id,
                label: toolDetails.title,
                href: `/owner/tools/${doc.id}`,
                icon: IconComponent
            };
        }).filter(Boolean);

        setActivatedTools(userTools as any[]);

      } catch (error) {
        console.error("Error fetching activated tools:", error);
      } finally {
        setIsLoadingTools(false);
      }
    };

    fetchTools();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {(isLoadingTools || activatedTools.length > 0) && (
            <Collapsible
              open={isToolsOpen}
              onOpenChange={setIsToolsOpen}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={isRTL ? "أدواتي المفعلة" : "My Activated Tools"}>
                    <Box />
                    <span>{isRTL ? "أدواتي المفعلة" : "My Activated Tools"}</span>
                    <ChevronDown className={isRTL ? "mr-auto" : "ml-auto"} />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {isLoadingTools ? (
                      <div className="p-2 space-y-1">
                        <SidebarMenuSkeleton showIcon />
                        <SidebarMenuSkeleton showIcon />
                      </div>
                    ) : (
                      activatedTools.map((tool) => (
                        <SidebarMenuSubItem key={tool.id}>
                          <SidebarMenuSubButton asChild isActive={pathname === tool.href}>
                            <Link href={tool.href}>
                              <tool.icon className="h-4 w-4" />
                              <span>{tool.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))
                    )}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )}

          <Separator className="my-2" />
          
          {supportItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/owner/settings"}>
              <Link href="/owner/settings">
                <Settings />
                <span>{isRTL ? "الإعدادات" : "Settings"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut />
              <span>{isRTL ? "تسجيل الخروج" : "Logout"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="px-2 py-1">
              <LanguageSwitcherSimple />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
