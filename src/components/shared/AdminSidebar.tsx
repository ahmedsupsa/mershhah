'use client';

import { usePathname, useRouter } from "next/navigation";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  MessageSquare,
  Building,
  Store,
  Users,
  Activity,
  Megaphone,
  AppWindow,
  Package,
} from "lucide-react";
import { Logo } from "./Logo";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { LanguageSwitcherSimple } from "./LanguageSwitcher";
import { useLanguage } from "./LanguageContext";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Badge } from "../ui/badge";

const SUPER_ADMIN_EMAIL = 'ahmedsupsa@gmail.com';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { locale } = useLanguage();
  const isRTL = locale === 'ar';
  const [unreadCount, setUnreadCount] = useState(0);

  const menuItems = [
    { href: "/admin/dashboard", label: isRTL ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, permissionId: 'dashboard' },
    { href: "/admin/management", label: isRTL ? "المشتركين" : "Subscribers", icon: Building, permissionId: 'management' },
    { href: "/admin/plans", label: isRTL ? "الباقات" : "Plans", icon: Package, permissionId: 'financials' },
    { href: "/admin/store-management", label: isRTL ? "إدارة المتجر" : "Store Management", icon: Store, permissionId: 'store-management' },
    { href: "/admin/applications", label: isRTL ? "التطبيقات" : "Applications", icon: AppWindow, permissionId: 'applications' },
    { href: "/admin/announcements", label: isRTL ? "الإعلانات" : "Announcements", icon: Megaphone, permissionId: 'announcements' },
    { href: "/admin/support", label: isRTL ? "الدعم المباشر" : "Live Support", icon: MessageSquare, permissionId: 'support' },
    { href: "/admin/team", label: isRTL ? "الفريق" : "Team", icon: Users, permissionId: 'team' },
    { href: "/admin/workflow", label: isRTL ? "سير العمل" : "Workflow", icon: Activity, permissionId: 'workflow' },
  ];

  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    const q = query(collection(db, "chats"), where("adminHasUnread", "==", true));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        setUnreadCount(querySnapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
    router.refresh();
  };
  
  const visibleMenuItems = menuItems.filter(item => {
    if (user?.email === SUPER_ADMIN_EMAIL) {
        return true;
    }
    return user?.admin_permissions?.includes(item.permissionId);
  });

  return (
    <aside className="flex h-full flex-col">
      <SidebarHeader>
        <Logo />
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
              >
                <Link href={item.href} className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                   {item.href === "/admin/support" && unreadCount > 0 && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground">{unreadCount}</Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/admin/settings">
                <Settings className="h-4 w-4" />
                {isRTL ? "الإعدادات" : "Settings"}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Separator className="my-2" />
        <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" />
          {isRTL ? "تسجيل الخروج" : "Logout"}
        </SidebarMenuButton>
        <div className="px-2 py-1 mt-2">
          <LanguageSwitcherSimple />
        </div>
      </SidebarFooter>
    </aside>
  );
}
