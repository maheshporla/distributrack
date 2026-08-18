import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, ShieldCheck, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { paymentService } from "@/services/api/paymentService";

import type {
  Payment,
  PaymentInitiationResponse,
  UpiDetails,
} from "@/types/payment.types";
import { formatINR } from "@/lib/formatters";

interface PaymentCheckoutProps {
  orderId: number;
  orderNumber: string;
  amount: number;
  onSuccess: (payment: Payment) => void;
  onClose: () => void;
}

/**
 * Online payment flow. The backend decides the mode:
 *
 *  - GATEWAY: the Razorpay checkout (test keys from the backend) opens in
 *    an iframe/dialog; the success callback posts razorpay order/payment
 *    id + signature to /api/payments/verify, which verifies the HMAC
 *    signature and re-fetches the payment from Razorpay before recording.
 *    The frontend can never mark a payment paid on its own.
 *
 *  - MOCK: the backend itself plays the gateway (development default).
 *    It issues the payment id + signature at initiation, and this dialog
 *    simply completes the simulated checkout with those values — the
 *    verify step validates the signature exactly like the real flow.
 */
export function PaymentCheckout({
  orderId,
  orderNumber,
  amount,
  onSuccess,
  onClose,
}: PaymentCheckoutProps) {
  const [initiation, setInitiation] = useState<PaymentInitiationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi" | null>(null);
  const [upiDetails, setUpiDetails] = useState<UpiDetails | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [upiInitiating, setUpiInitiating] = useState(false);

  // ---------------------------------------------------------
  // 1. Initiate the gateway order (nothing is recorded yet)
  // ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    paymentService
      .initiateGatewayPayment({ orderId, amount })
      .then((response) => {
        if (cancelled) return;
        setInitiation(response);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to start payment");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, amount]);

  // ---------------------------------------------------------
  // 2. GATEWAY mode: open the Razorpay checkout
  // ---------------------------------------------------------
  const openRazorpayCheckout = useCallback(
    (init: PaymentInitiationResponse) => {
      const keyId = init.keyId;
      if (!keyId) {
        setError("Payment gateway is not configured (missing key id)");
        return;
      }

      // Dynamically load the Razorpay checkout script (test/live keys
      // come from the backend, never hardcoded in the frontend).
      const loadScript = () =>
        new Promise<void>((resolve, reject) => {
          if ((window as any).Razorpay) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
          document.body.appendChild(script);
        });

      loadScript()
        .then(() => {
          const options = {
            key: keyId,
            amount: Math.round(init.amount * 100), // paise
            currency: init.currency || "INR",
            name: "DistribuTrack",
            description: `Payment for order ${init.orderNumber}`,
            order_id: init.gatewayOrderId,
            handler: async (response: {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            }) => {
              try {
                setVerifying(true);
                const payment = await paymentService.verifyGatewayPayment({
                  orderId: init.orderId,
                  amount: init.amount,
                  gatewayOrderId: response.razorpay_order_id,
                  gatewayPaymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
                toast.success("Payment verified and recorded");
                onSuccess(payment);
              } catch (err: any) {
                console.error(err);
                toast.error(err?.message ?? "Payment verification failed");
              } finally {
                setVerifying(false);
              }
            },
            modal: {
              ondismiss: () => {
                /* user closed the checkout — leave the order unpaid */
              },
            },
            theme: { color: "#4f46e5" },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on("payment.failed", (_response: unknown) => {
            toast.error("Payment failed. You can try again.");
          });
          rzp.open();
        })
        .catch((err: any) => {
          console.error(err);
          setError(err?.message ?? "Failed to load Razorpay checkout");
        });
    },
    [onSuccess],
  );

  // Open the Razorpay checkout once the initiation returns.
  useEffect(() => {
    if (initiation && initiation.mode === "GATEWAY" && !openedRef.current) {
      openedRef.current = true;
      openRazorpayCheckout(initiation);
    }
  }, [initiation, openRazorpayCheckout]);

  // ---------------------------------------------------------
  // 3. UPI mode: fetch UPI details + generate QR
  // ---------------------------------------------------------
  const loadUpiDetails = useCallback(async () => {
    try {
      const details = await paymentService.getUpiDetails(orderId);
      setUpiDetails(details);

      // Generate QR code from the UPI URI
      const qrDataUrl = await QRCode.toDataURL(details.upiUri, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setUpiQrDataUrl(qrDataUrl);
    } catch (err: any) {
      // The axios interceptor normalizes errors to { status, message, errors }
      setError(err?.message ?? "Failed to load UPI details");
    }
  }, [orderId]);

  const handleUpiPayment = async () => {
    if (!initiation) return;
    try {
      setUpiInitiating(true);
      await paymentService.initiateUpiPayment({
        orderId: initiation.orderId,
        amount: initiation.amount,
      });
      toast.success("UPI payment recorded — pending admin verification");
      // Refresh the page so the admin can see the pending payment
      window.location.reload();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to record UPI payment");
    } finally {
      setUpiInitiating(false);
    }
  };

  // Load UPI details when the user selects UPI
  useEffect(() => {
    if (paymentMethod === "upi" && !upiDetails) {
      loadUpiDetails();
    }
  }, [paymentMethod, upiDetails, loadUpiDetails]);

  // ---------------------------------------------------------
  // 4. MOCK mode: complete the simulated checkout
  // ---------------------------------------------------------
  const completeMockPayment = async () => {
    if (!initiation) return;
    try {
      setVerifying(true);
      const payment = await paymentService.verifyGatewayPayment({
        orderId: initiation.orderId,
        amount: initiation.amount,
        gatewayOrderId: initiation.gatewayOrderId,
        gatewayPaymentId: initiation.mockPaymentId!,
        signature: initiation.mockSignature!,
      });
      toast.success("Test payment verified and recorded");
      onSuccess(payment);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Payment verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const mock = initiation?.mode === "MOCK";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Pay for {orderNumber}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={verifying || loading}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Starting secure payment…
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {!loading && !error && initiation && !paymentMethod && (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(initiation.amount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Order</span>
                <span className="font-mono text-xs">{initiation.orderNumber}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">Choose payment method:</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("razorpay")}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <CreditCard className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Razorpay</span>
                <span className="text-xs text-muted-foreground">Card / UPI / Netbanking</span>
              </button>

              <button
                onClick={() => setPaymentMethod("upi")}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Smartphone className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Direct UPI</span>
                <span className="text-xs text-muted-foreground">Scan QR / Pay via app</span>
              </button>
            </div>
          </div>
        )}

        {/* Razorpay path */}
        {!loading && !error && initiation && paymentMethod === "razorpay" && (
          <div className="space-y-4 pt-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatINR(initiation.amount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Gateway order</span>
                <span className="font-mono text-xs">{initiation.gatewayOrderId}</span>
              </div>
            </div>

            {mock ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Test gateway (development mode) — no real money moves.
                    The payment is still recorded through the backend's
                    signature-verified flow.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={completeMockPayment}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying payment…
                    </>
                  ) : (
                    "Complete Test Payment"
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Razorpay checkout opening…</Badge>
                {verifying && (
                  <span className="text-xs text-muted-foreground">
                    Verifying payment…
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* UPI path */}
        {!loading && !error && initiation && paymentMethod === "upi" && (
          <div className="space-y-4 pt-4">
            {upiDetails ? (
              <>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold">{formatINR(upiDetails.amount)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Distributor</span>
                    <span className="font-medium">{upiDetails.distributorName}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">UPI ID</span>
                    <span className="font-mono text-xs">{upiDetails.upiId}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Order</span>
                    <span className="font-mono text-xs">{upiDetails.orderNumber}</span>
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
                    <li>Open any UPI app (PhonePe, GPay, Paytm, etc.)</li>
                    <li>Scan the QR code or pay to <strong>{upiDetails.upiId}</strong></li>
                    <li>Pay exactly <strong>{formatINR(upiDetails.amount)}</strong></li>
                    <li>After payment, click "I've Paid via UPI" below</li>
                  </ol>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-50 p-3 text-xs text-blue-700 dark:border-blue-400/30 dark:bg-blue-950 dark:text-blue-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Your payment will be verified by admin staff before being marked as received.
                    This prevents fraudulent "I Paid" claims.
                  </p>
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleUpiPayment}
                  disabled={upiInitiating}
                >
                  {upiInitiating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording…
                    </>
                  ) : (
                    "I've Paid via UPI"
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading UPI details…</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
