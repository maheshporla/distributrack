package com.distributrack.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Delegates to the active {@link SmsProvider}: LoggingSmsProvider when
 * {@code app.sms.provider=log} (the default), or HttpSmsProvider when
 * {@code app.sms.provider=http}. Only one provider bean is active at
 * runtime — no @Primary ambiguity. Delivery is asynchronous and
 * failure-tolerant.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsServiceImpl implements SmsService {

    private final SmsProvider smsProvider;

    @Override
    @Async("notificationExecutor")
    public void send(String to, String message) {
        try {
            smsProvider.send(to, message);
        } catch (Exception ex) {
            log.warn("[SMS] delivery failed to {}: {}", to, ex.getMessage());
        }
    }
}
