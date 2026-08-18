package com.distributrack.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Generic HTTP SMS gateway for production. Activated with
 * {@code app.sms.provider=http}; the endpoint and key come from
 * environment variables (SMS_API_URL / SMS_API_KEY / SMS_SENDER).
 *
 * The provider contract is deliberately simple — swap in any gateway
 * that accepts phone + message (Textlocal, MSG91, Twilio's HTTP API,
 * ...) by implementing {@link SmsProvider}.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.sms", name = "provider", havingValue = "http")
public class HttpSmsProvider implements SmsProvider {

    private final String apiUrl;
    private final String apiKey;
    private final String sender;
    private final RestClient restClient;

    public HttpSmsProvider(
            @Value("${app.sms.api-url:}") String apiUrl,
            @Value("${app.sms.api-key:}") String apiKey,
            @Value("${app.sms.sender:DistribuTrack}") String sender) {

        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.sender = sender;
        this.restClient = RestClient.create();
    }

    @Override
    public void send(String to, String message) {

        if (apiUrl == null || apiUrl.isBlank()) {
            log.warn("[SMS] provider configured as http but SMS_API_URL is not set — message not sent");
            return;
        }

        try {
            restClient.post()
                    .uri(apiUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "to", to,
                            "message", message,
                            "sender", sender
                    ))
                    .retrieve()
                    .toBodilessEntity();

            log.info("[SMS] sent to {}", to);
        } catch (Exception ex) {
            log.warn("[SMS] failed to send to {}: {}", to, ex.getMessage());
        }
    }
}
