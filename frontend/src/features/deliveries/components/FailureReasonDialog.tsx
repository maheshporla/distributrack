import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FailureReasonDialogProps {
  isOpen: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Inline card-based dialog for collecting a failure reason when a
 * delivery boy marks a delivery as FAILED. Uses a Card instead of
 * a modal overlay to stay consistent with the app's existing pattern
 * (no dialog.tsx component in the UI library).
 *
 * The backend requires the reason for audit trail and shopkeeper visibility.
 */
export function FailureReasonDialog({
  isOpen,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: FailureReasonDialogProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Delivery Failed — Reason Required
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please provide a reason for the delivery failure. This will be
            visible to the shopkeeper and administrators.
          </p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer not available, wrong address, refused delivery..."
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!reason.trim() || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm Failed"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
