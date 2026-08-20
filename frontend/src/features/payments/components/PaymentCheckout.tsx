import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  ShieldCheck,
  Smartphone,
  Banknote,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";

import { paymentService } from "@/services/api/paymentService";

import type { Payment, UpiDetails } from "@/types/payment.types";
import { formatINR } from "@/lib/formatters";

type PaymentMethod = "upi" | "cash" | "cod";

interface PaymentCheckoutProps {
  orderId: number;
  orderNumber: string;
  amount: number;
  onSuccess: (payment: Payment) => void;
  onClose: () => void;
}

/**
 * Payment flow with three options: UPI, Cash, and Cash on Delivery.
 *
 * UPI: Shopkeeper scans QR, pays via any UPI app, clicks "I've Paid".
 * Cash: Shopkeeper confirms they will pay cash to the distributor.
 * COD: Payment is collected during delivery by the delivery boy.
 *
 * All three methods create a PENDING_VERIFICATION payment — the backend
 * never auto-marks as SUCCESS. Admin/distributor must verify.
 */
export function PaymentCheckout({
  orderId,
  orderNumber,
  amount,
  onSuccess,
  onClose,
}: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [upiDetails, setUpiDetails] = useState<UpiDetails | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [loadingUpi, setLoadingUpi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Load UPI details when user selects UPI
  // ---------------------------------------------------------
  const loadUpiDetails = useCallback(async () => {
    try {
      setLoadingUpi(true);
      const details = await paymentService.getUpiDetails(orderId);
      setUpiDetails(details);

      const qrDataUrl = await QRCode.toDataURL(details.upiUri, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setUpiQrDataUrl(qrDataUrl);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load UPI details");
    } finally {
      setLoadingUpi(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (paymentMethod === "upi" && !upiDetails && !loadingUpi) {
      loadUpiDetails();
    }
  }, [paymentMethod, upiDetails, loadingUpi, loadUpiDetails]);

  // ---------------------------------------------------------
  // UPI: "I've Paid via UPI" — no UTR required
  // ---------------------------------------------------------
  const handleUpiSubmit = async () => {
    try {
      setSubmitting(true);
      await paymentService.submitUpiPayment({ orderId });
      setSubmitted(true);
      toast.success(
        "Payment submitted successfully. It will be verified by the distributor.",
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit UPI payment");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // Cash: "Confirm Cash Payment"
  // ---------------------------------------------------------
  const handleCashSubmit = async () => {
    try {
      setSubmitting(true);
      await paymentService.submitCashPayment({ orderId });
      setSubmitted(true);
      toast.success(
        "Cash payment submitted. It will be verified by the distributor.",
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit cash payment");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // COD: "Confirm Cash on Delivery"
  // ---------------------------------------------------------
  const handleCodSubmit = async () => {
    try {
      setSubmitting(true);
      await paymentService.submitCodPayment({ orderId });
      setSubmitted(true);
      toast.success(
        "Cash on Delivery selected. The delivery boy will collect the payment.",
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit COD payment");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------
  // After submission: close on success
  // ---------------------------------------------------------
  const handleClose = () => {
    if (submitted) {
      // Refresh the page data by calling onSuccess with a dummy payment
      onSuccess({
        id: 0,
        orderId,
        orderNumber,
        shopkeeperId: 0,
        shopkeeperName: "",
        orderTotalAmount: amount,
        amount,
        paymentMethod: paymentMethod === "upi" ? "UPI" : paymentMethod === "cash" ? "CASH" : "CASH_ON_DELIVERY",
        paymentStatus: "PENDING_VERIFICATION",
        paymentChannel: paymentMethod === "upi" ? "UPI" : paymentMethod === "cash" ? "CASH" : "CASH_ON_DELIVERY",
        transactionId: "",
        utr: null,
        rejectionReason: null,
        verifiedByName: null,
        verifiedAt: null,
        paymentDate: new Date().toISOString(),
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pay for {orderNumber}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Submitted state */}
        {submitted && (
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-2 rounded-lg border border-green-400/40 bg-green-50 p-3 text-xs text-green-700 dark:border-green-400/30 dark:bg-green-950 dark:text-green-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                <strong>Payment submitted successfully.</strong>
                <br />
                {paymentMethod === "cod"
                  ? "The delivery boy will collect the cash when your order is delivered."
                  : "It will be verified by the distributor. You will be notified once verified."}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {/* Method selection */}
        {!submitted && !paymentMethod && (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(amount)}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Choose payment method:
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod("upi")}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Smartphone className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">UPI</span>
                <span className="text-xs text-muted-foreground">
                  Scan QR / Pay
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod("cash")}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Banknote className="h-6 w-6 text-amber-600" />
                <span className="text-sm font-medium">Cash</span>
                <span className="text-xs text-muted-foreground">
                  Pay in person
                </span>
              </button>

              <button
                onClick={() => setPaymentMethod("cod")}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Truck className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">COD</span>
                <span className="text-xs text-muted-foreground">
                  Pay on delivery
                </span>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
          </div>
        )}

        {/* UPI path */}
        {!submitted && paymentMethod === "upi" && (
          <div className="space-y-4 pt-4">
            {loadingUpi ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Loading UPI details…
                </p>
              </div>
            ) : upiDetails ? (
              <>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">
                      {formatINR(upiDetails.amount)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Pay to</span>
                    <span className="font-mono text-xs">
                      {upiDetails.upiId}
                    </span>
                  </div>
                </div>

                {upiQrDataUrl && (
                  <div className="flex justify-center">
                    <img
                      src={upiQrDataUrl}
                      alt="UPI QR Code"
                      className="rounded-lg border bg-white p-2"
                      width={200}
                      height={200}
                    />
                  </div>
                )}

                <div className="rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-300">
                  <p className="font-medium">Instructions:</p>
                  <ol className="mt-1 list-inside list-decimal space-y-0.5">
                    <li>
                      Open any UPI app (PhonePe, GPay, Paytm, etc.)
                    </li>
                    <li>
                      Scan the QR code or pay to{" "}
                      <strong>{upiDetails.upiId}</strong>
                    </li>
                    <li>
                      Pay exactly <strong>{formatINR(upiDetails.amount)}</strong>
                    </li>
                    <li>Return here and click "I've Paid via UPI"</li>
                  </ol>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleUpiSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "I've Paid via UPI"
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setPaymentMethod(null)}
                  disabled={submitting}
                >
                  ← Back to payment methods
                </Button>
              </>
            ) : error ? (
              <div className="py-6">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Cash path */}
        {!submitted && paymentMethod === "cash" && (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(amount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono text-xs">{orderNumber}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">Cash</span>
              </div>
            </div>

            <div className="rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-400/30 dark:bg-amber-950 dark:text-amber-300">
              <p>
                Pay the amount in cash to the distributor or authorized delivery
                person.
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleCashSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Confirm Cash Payment"
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setPaymentMethod(null)}
              disabled={submitting}
            >
              ← Back to payment methods
            </Button>
          </div>
        )}

        {/* COD path */}
        {!submitted && paymentMethod === "cod" && (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount to collect</span>
                <span className="font-semibold">{formatINR(amount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono text-xs">{orderNumber}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">Cash on Delivery</span>
              </div>
            </div>

            <div className="rounded-lg border border-blue-400/40 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-400/30 dark:bg-blue-950 dark:text-blue-300">
              <p>
                Please pay the exact amount in cash when your order is
                delivered. The delivery boy will collect the payment.
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleCodSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Confirm Cash on Delivery"
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setPaymentMethod(null)}
              disabled={submitting}
            >
              ← Back to payment methods
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
