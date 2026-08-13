import { Outlet } from "react-router-dom";
import { Package2, BarChart3, Boxes, Truck } from "lucide-react";
import { APP_NAME } from "@/constants/app.constants";

/**
 * Layout for unauthenticated pages: Login, Register, Forgot Password.
 * Left panel carries the brand story on larger screens; the form itself
 * (rendered via <Outlet />) is always centered and full-width on mobile.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel — hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Package2 className="size-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-sidebar-foreground">
            {APP_NAME}
          </span>
        </div>

        <div className="space-y-6">
          <h2 className="max-w-md text-3xl font-semibold leading-tight text-sidebar-foreground">
            Run your entire distribution operation from one place.
          </h2>
          <p className="max-w-sm text-sm text-sidebar-foreground/70">
            Track stock across warehouses, dispatch delivery workers, and reconcile
            invoices — without leaving the dashboard.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { icon: Boxes, label: "Live inventory" },
              { icon: Truck, label: "Delivery tracking" },
              { icon: BarChart3, label: "Sales analytics" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-3"
              >
                <Icon className="size-4.5 text-sidebar-primary" />
                <p className="mt-2 text-xs font-medium text-sidebar-foreground/80">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-1 items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
