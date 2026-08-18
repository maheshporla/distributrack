package com.distributrack.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Development SMS provider: logs the message as [SMS MOCK]. Active when
 * {@code app.sms.provider=log} (the default), so the notification pipeline
 * works without any SMS account. Switching to a real provider is pure
 * configuration (app.sms.provider=http + credentials): because this bean
 * only exists in "log" mode, HttpSmsProvider is the sole SmsProvider when
 * "http" is selected — no @Primary ambiguity.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.sms", name = "provider", havingValue = "log", matchIfMissing = true)
public class LoggingSmsProvider implements SmsProvider {

    @Override
    public void send(String to, String message) {
        log.info("[SMS MOCK] to={} | message={}", to, message);
    }
}
