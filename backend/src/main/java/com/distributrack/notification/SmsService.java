package com.distributrack.notification;

/**
 * Outbound SMS notifications — the business-facing facade over the
 * configured {@link SmsProvider}. Async and never throws into callers.
 */
public interface SmsService {

    void send(String to, String message);
}
