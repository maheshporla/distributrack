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
import { ROUTES } from "@/constants/routes.constants";
import { getInitials, formatRelativeTime } from "@/lib/formatters";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore, startNotificationPolling, stopNotificationPolling } from "@/store/notificationStore";
import { notificationRoute } from "@/types/notification.types";
import { useLogout } from "@/features/auth/hooks/useLogout";

/**
 * Sticky top bar shown above the routed page content. Hosts the mobile
 * nav trigger (the Sidebar is desktop-only), global search, theme
 * toggle, notifications entry point, and the account menu.
 */
export function Navbar() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  // Start the lightweight notification poller while the navbar is mounted.
  useEffect(() => {
    startNotificationPolling();
    return stopNotificationPolling;
  }, []);

  const initials = user?.fullName ? getInitials(user.fullName) : "DT";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
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
          <SidebarNav onNavigate={() => setIsMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Global search */}
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search products, orders, customers…"
          className="pl-8"
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4.5 scale-100 dark:scale-0" />
          <Moon className="absolute size-4.5 scale-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <span className="relative">
                <Bell className="size-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="font-medium">
                Notifications
              </DropdownMenuLabel>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild>
                    <Link
                      to={notificationRoute(notification.type)}
                      className="flex items-start gap-2.5 px-3 py-2"
                    >
                      <span
                        className={
                          notification.read
                            ? "mt-1.5 size-2 shrink-0 rounded-full bg-transparent"
                            : "mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {notification.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {notification.message}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground/70">
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
              <Link to={ROUTES.NOTIFICATIONS} className="justify-center font-medium">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 gap-2 px-1.5">
              <Avatar className="size-7">
                {/* TODO(backend): swap in AvatarImage once the backend returns
                    an avatar URL — there is no such field on AuthenticatedUser
                    today, so only the initials fallback can render. */}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                {user?.fullName ?? "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.fullName ?? "Guest User"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={ROUTES.SETTINGS}>
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={ROUTES.SETTINGS}>
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
