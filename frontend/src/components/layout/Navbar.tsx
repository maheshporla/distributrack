import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, LogOut, Menu, Moon, Search, Settings, Sun, User } from "lucide-react";
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
import { useAuthStore } from "@/store/authStore";
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

  // TODO(backend): once AuthenticatedUser carries a fullName (see
  // auth.types.ts), replace this email-derived fallback with real
  // initials from the user's name.
  const initials = user ? user.email.slice(0, 2).toUpperCase() : "DT";

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
        <Button variant="ghost" size="icon" asChild aria-label="Notifications">
          <Link to={ROUTES.NOTIFICATIONS} className="relative">
            <Bell className="size-4.5" />
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
          </Link>
        </Button>

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
                {user?.email ?? "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              {/* TODO(backend): show the user's full name here once the
                  backend exposes it (no /me endpoint, no name claim in the
                  JWT today — see AuthenticatedUser in auth.types.ts). Email
                  is the only identifier available client-side right now. */}
              <p className="truncate text-sm font-medium text-foreground">
                {user?.email ?? "Guest User"}
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
