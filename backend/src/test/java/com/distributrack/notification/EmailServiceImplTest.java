package com.distributrack.notification;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies the two email paths:
 *  - EMAIL_ENABLED=false (or no SMTP) -> [EMAIL MOCK] logging, never an
 *    SMTP call — development never depends on a real server.
 *  - EMAIL_ENABLED=true + JavaMailSender -> the message is handed to the
 *    mail sender for real delivery.
 */
class EmailServiceImplTest {

    private JavaMailSender mailSender;
    private ObjectProvider<JavaMailSender> provider;
    private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        mailSender = mock(JavaMailSender.class);
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        provider = mock(ObjectProvider.class);
    }

    private EmailServiceImpl service(boolean enabled, boolean hasSender) {
        when(provider.getIfAvailable())
                .thenReturn(hasSender ? mailSender : null);
        EmailServiceImpl svc = new EmailServiceImpl(provider);
        setField(svc, "enabled", enabled);
        setField(svc, "from", "DistribuTrack <no-reply@distributrack.local>");
        return svc;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            var field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    @Test
    void disabled_emailIsNeverSentViaSmtp() {
        emailService = service(false, true);
        emailService.send("shop@example.com", "Order #1", "<p>Hi</p>");
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void enabled_withoutSmtp_fallsBackToMock() {
        emailService = service(true, false);
        emailService.send("shop@example.com", "Order #1", "<p>Hi</p>");
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void enabled_withSmtp_sendsRealMessage() {
        emailService = service(true, true);
        emailService.send("shop@example.com", "Order #1", "<p>Hi</p>");
        verify(mailSender).send(any(MimeMessage.class));
    }

}
