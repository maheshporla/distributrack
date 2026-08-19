package com.distributrack.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for {@link NotificationDeliveryEvent}s and fans each one out
 * to the out-of-band channels: email and SMS. Runs on the dedicated
 * notification executor so external providers never block business
 * requests. Each channel is best-effort and failure-isolated.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDeliveryListener {

    private final EmailService emailService;
    private final SmsService smsService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Async("notificationExecutor")
    @EventListener
    public void onNotificationCreated(NotificationDeliveryEvent event) {

        if (event.getRecipientEmail() != null && !event.getRecipientEmail().isBlank()) {
            String htmlBody = buildHtmlEmail(event);
            emailService.send(
                    event.getRecipientEmail(),
                    event.getTitle(),
                    htmlBody
            );
        }

        if (event.getRecipientPhone() != null && !event.getRecipientPhone().isBlank()) {
            String smsBody = buildSmsBody(event);
            smsService.send(event.getRecipientPhone(), smsBody);
        }
    }

    private String buildHtmlEmail(NotificationDeliveryEvent event) {
        String title = event.getTitle();
        String message = event.getMessage();
        String name = event.getRecipientName() != null ? event.getRecipientName() : "User";
        String content = "";

        switch (event.getType()) {
            case WORKER_CREATED:
                String activationUrl = extractUrl(message);
                content = "<h2 style=\"color:#4F46E5;margin-top:0;\">Your DistribuTrack Worker Account</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>Your DistribuTrack worker account has been created successfully.</p>"
                        + "<p><strong>Role:</strong> Delivery Worker</p>"
                        + "<p>Please use the secure activation link below to set your password and activate your account:</p>"
                        + "<p style=\"text-align:center;margin:30px 0;\">"
                        + "  <a href=\"" + activationUrl + "\" style=\"background-color:#4F46E5;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;\">Activate Account</a>"
                        + "</p>"
                        + "<p style=\"color:#6b7280;font-size:12px;\">If the button above does not work, copy and paste the following link into your browser:<br/>"
                        + "<a href=\"" + activationUrl + "\" style=\"color:#4F46E5;\">" + activationUrl + "</a></p>";
                break;

            case DELIVERY_ASSIGNED:
                content = "<h2 style=\"color:#4F46E5;margin-top:0;\">New Delivery Assigned</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>Please log in to your worker dashboard to view shipment details, customer address, and vehicle assignment.</p>"
                        + "<p style=\"text-align:center;margin:30px 0;\">"
                        + "  <a href=\"" + frontendUrl + "/login\" style=\"background-color:#4F46E5;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;\">Go to Dashboard</a>"
                        + "</p>";
                break;

            case ORDER_APPROVED:
                content = "<h2 style=\"color:#10B981;margin-top:0;\">Order Approved</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>Your order is currently being processed and will be dispatched shortly.</p>"
                        + "<p style=\"text-align:center;margin:30px 0;\">"
                        + "  <a href=\"" + frontendUrl + "/login\" style=\"background-color:#10B981;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;\">Track Order</a>"
                        + "</p>";
                break;

            case ORDER_REJECTED:
                content = "<h2 style=\"color:#EF4444;margin-top:0;\">Order Rejected</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>Please review order details and outstanding invoices, or contact your distributor representative to resolve.</p>";
                break;

            case DELIVERY_OUT_FOR_DELIVERY:
                content = "<h2 style=\"color:#3B82F6;margin-top:0;\">Order Out For Delivery</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>A delivery boy is currently en route to your business location.</p>";
                break;

            case DELIVERY_DELIVERED:
                content = "<h2 style=\"color:#10B981;margin-top:0;\">Order Delivered Successfully</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>Thank you for doing business with DistribuTrack. Your invoice is now ready for view and print.</p>";
                break;

            case PAYMENT_SUCCESS:
                content = "<h2 style=\"color:#10B981;margin-top:0;\">Payment Confirmed</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>We have successfully received and processed your payment.</p>";
                break;

            case PAYMENT_FAILED:
                content = "<h2 style=\"color:#EF4444;margin-top:0;\">Payment Transaction Failed</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>"
                        + "<p>Please retry the payment transaction or select an alternative payment method.</p>";
                break;

            default:
                content = "<h2 style=\"color:#4F46E5;margin-top:0;\">" + escapeHtml(title) + "</h2>"
                        + "<p>Hello <strong>" + escapeHtml(name) + "</strong>,</p>"
                        + "<p>" + escapeHtml(message) + "</p>";
                break;
        }

        return "<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;\">"
                + "<div style=\"text-align:center;margin-bottom:20px;\">"
                + "  <span style=\"font-size:24px;font-weight:bold;color:#4F46E5;\">DistribuTrack</span>"
                + "</div>"
                + "<hr style=\"border:none;border-top:1px solid #e5e7eb;margin-bottom:20px;\" />"
                + content
                + "<hr style=\"border:none;border-top:1px solid #e5e7eb;margin:20px 0;\" />"
                + "<p style=\"color:#9ca3af;font-size:12px;text-align:center;\">DistribuTrack — Distribution Management System</p>"
                + "</div>";
    }

    private String buildSmsBody(NotificationDeliveryEvent event) {
        String message = event.getMessage();
        switch (event.getType()) {
            case WORKER_CREATED:
                return "DistribuTrack: Your worker account has been created. Check your registered email for activation details.";

            case DELIVERY_ASSIGNED:
                return "DistribuTrack: " + message;

            case ORDER_APPROVED:
                return "DistribuTrack: " + message;

            case ORDER_REJECTED:
                return "DistribuTrack: " + message;

            case DELIVERY_OUT_FOR_DELIVERY:
                return "DistribuTrack: " + message;

            case DELIVERY_DELIVERED:
                return "DistribuTrack: " + message;

            case PAYMENT_SUCCESS:
                return "DistribuTrack: " + message;

            case PAYMENT_FAILED:
                return "DistribuTrack: " + message;

            default:
                return "DistribuTrack: " + event.getTitle() + " - " + message;
        }
    }

    private String extractUrl(String message) {
        if (message == null) {
            return frontendUrl;
        }
        int idx = message.indexOf("http");
        if (idx != -1) {
            return message.substring(idx).trim();
        }
        return frontendUrl;
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
