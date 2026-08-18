package com.distributrack.notification;

/**
 * Pluggable SMS gateway. Implementations must never throw into the
 * caller — delivery problems are logged by the caller.
 *
 *  - {@link LoggingSmsProvider} — default; logs the message (mock mode).
 *  - {@link HttpSmsProvider}    — generic HTTP provider, activated with
 *    app.sms.provider=http + SMS_API_URL / SMS_API_KEY env variables.
 */
public interface SmsProvider {

    void send(String to, String message);
}
