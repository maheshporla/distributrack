import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { UserProfile } from "@/types/auth.types";
import { formatDate } from "@/lib/formatters";

interface UserDetailsProps {
  user: UserProfile;
  onBack: () => void;
}

export function UserDetails({ user, onBack }: UserDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{user.fullName}</h2>
            <p className="text-muted-foreground mt-1">ID: #{user.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">
              {user.role}
            </Badge>
            <Badge
              variant={user.enabled ? "success" : "secondary"}
              className="text-sm px-3 py-1"
            >
              {user.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 mt-6 sm:grid-cols-2 md:grid-cols-3 border-t pt-6 text-sm">
          <div>
            <span className="text-muted-foreground block">Email Address</span>
            <span className="font-medium text-foreground">{user.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Phone Number</span>
            <span className="font-medium text-foreground">{user.phone}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Created Date</span>
            <span className="font-medium text-foreground">
              {formatDate(user.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
