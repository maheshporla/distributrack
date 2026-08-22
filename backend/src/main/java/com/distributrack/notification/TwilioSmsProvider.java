package com.distributrack.notification;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Production SMS delivery via Twilio API.
 * Activated purely via configuration: app.sms.provider=twilio.
 * Normalizes phone numbers to E.164 automatically.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.sms", name = "provider", havingValue = "twilio")
public class TwilioSmsProvider implements SmsProvider {

    private final String accountSid;
    private final String authToken;
    private final String fromPhoneNumber;

    public TwilioSmsProvider(
            @Value("${app.sms.twilio.account-sid:}") String accountSid,
            @Value("${app.sms.twilio.auth-token:}") String authToken,
            @Value("${app.sms.twilio.phone-number:}") String fromPhoneNumber) {

        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromPhoneNumber = fromPhoneNumber;
    }

    @Override
    public void send(String to, String message) {

        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            log.warn("[SMS] Twilio provider active but TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing — message not sent");
            return;
        }

        String recipient = normalizePhoneNumber(to);
        if (recipient == null || recipient.isBlank()) {
            log.warn("[SMS] Invalid recipient phone number '{}' — skipping SMS delivery", to);
            return;
        }

        try {
            Twilio.init(accountSid, authToken);
            Message twilioMsg = Message.creator(
                    new PhoneNumber(recipient),
                    new PhoneNumber(fromPhoneNumber),
                    message
            ).create();

            log.info("[SMS] Twilio message accepted: SID={}", twilioMsg.getSid());
        } catch (Exception ex) {
            log.warn("[SMS] Twilio delivery failed: {}", ex.getMessage());
        }
    }

    /**
     * Safely normalizes standard local numbers to E.164 international format.
     * Assumes Indian country code (+91) for 10-digit formats as fallback.
     */
    private String normalizePhoneNumber(String phone) {
        if (phone == null) {
            return null;
        }

        String clean = phone.replaceAll("[^0-9+]", "");
        if (clean.startsWith("+")) {
            return clean;
        }

        if (clean.length() == 10) {
            return "+91" + clean;
        }

        if (clean.length() == 12 && clean.startsWith("91")) {
            return "+" + clean;
        }

        return clean;
    }
}
