import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, LogOut, Menu, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { DeliveryWorkerSidebar } from "@/components/layout/DeliveryWorkerSidebar";
import { ShopkeeperSidebar } from "@/components/layout/ShopkeeperSidebar";
import { ROUTES } from "@/constants/routes.constants";
import { getInitials, formatRelativeTime } from "@/lib/formatters";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, startNotificationPolling, stopNotificationPolling } from "@/store/notificationStore";
import { notificationRouteForRole } from "@/types/notification.types";
import { useLogout } from "@/features/auth/hooks/useLogout";

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  OWNER: "bg-primary/10 text-primary border-primary/20",
  MANAGER: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  SALESMAN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  DELIVERY_BOY: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  SHOPKEEPER: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
};

export function Navbar() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  useEffect(() => {
    startNotificationPolling();
    return stopNotificationPolling;
  }, []);

  const initials = user?.fullName ? getInitials(user.fullName) : "DT";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-6">
      {/* Mobile nav trigger */}
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {user?.role === "DELIVERY_BOY" ? (
            <DeliveryWorkerSidebar onNavigate={() => setIsMobileNavOpen(false)} />
          ) : user?.role === "SHOPKEEPER" ? (
            <ShopkeeperSidebar onNavigate={() => setIsMobileNavOpen(false)} />
          ) : (
            <SidebarNav onNavigate={() => setIsMobileNavOpen(false)} />
          )}
        </SheetContent>
      </Sheet>

      {/* Global search */}
      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, orders, customers…"
          className="h-9 pl-9 bg-muted/50 border-transparent focus:border-primary/30 focus:bg-card"
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 scale-100 dark:scale-0" />
          <Moon className="absolute size-4 scale-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground relative" aria-label="Notifications">
              <Bell className="size-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="text-sm font-semibold">
                Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild>
                    <Link
                      to={notificationRouteForRole(notification.type, user?.role)}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <span
                        className={
                          notification.read
                            ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
                            : "mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-sm shadow-primary/50"
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {notification.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground mt-0.5">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground/60">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to={user?.role === "DELIVERY_BOY" ? ROUTES.DELIVERY_WORKER_NOTIFICATIONS : ROUTES.NOTIFICATIONS} className="justify-center py-2 text-sm font-medium">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 gap-2.5 px-2 h-10 hover:bg-muted/50">
              <Avatar className="size-8 ring-2 ring-border">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold leading-none">{user?.fullName ?? "Account"}</p>
                {user?.role && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground capitalize">
                    {user.role.replace("_", " ").toLowerCase()}
                  </p>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <Avatar className="size-10 ring-2 ring-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {user?.fullName ?? "Guest User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span className={`mt-1 inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_BADGE_COLORS[user.role] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {user.role.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={user?.role === "DELIVERY_BOY" ? ROUTES.DELIVERY_PROFILE : ROUTES.SETTINGS}>
                <User className="size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={user?.role === "DELIVERY_BOY" ? ROUTES.DELIVERY_WORKER_SETTINGS : ROUTES.SETTINGS}>
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout} className="gap-2">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
