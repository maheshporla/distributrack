import { Outlet } from "react-router-dom";
import { DeliveryWorkerSidebar } from "@/components/layout/DeliveryWorkerSidebar";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Layout for the Delivery Worker portal. Uses the DeliveryWorkerSidebar
 * instead of the admin Sidebar. The Navbar is shared (shows user info, logout).
 */
export function DeliveryWorkerLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <DeliveryWorkerSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
