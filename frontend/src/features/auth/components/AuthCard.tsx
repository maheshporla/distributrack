import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Premium auth card with subtle shadow and clean layout.
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex w-full items-center justify-center">
      <Card className="w-full max-w-[440px] shadow-xl shadow-black/5 border-border/50">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm leading-relaxed">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>{children}</CardContent>

        {footer && (
          <CardFooter className="justify-center border-t border-border/50 pt-6 text-center">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
