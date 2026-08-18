package com.distributrack.notification;

import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * SmsServiceImpl must delegate to whatever provider is active (log mock
 * in development, HttpSmsProvider in production) and swallow provider
 * failures so a dead SMS gateway never breaks a business transaction.
 */
class SmsServiceImplTest {

    @Test
    void delegatesToActiveProvider() {
        SmsProvider provider = mock(SmsProvider.class);
        SmsServiceImpl service = new SmsServiceImpl(provider);

        service.send("1000000001", "Order #1 placed");

        verify(provider).send("1000000001", "Order #1 placed");
    }

    @Test
    void providerFailureDoesNotPropagate() {
        SmsProvider provider = mock(SmsProvider.class);
        doThrow(new RuntimeException("gateway down"))
                .when(provider).send("1000000001", "Order #1 placed");
        SmsServiceImpl service = new SmsServiceImpl(provider);

        // Must not throw — delivery failures are logged, not fatal.
        service.send("1000000001", "Order #1 placed");
    }
}
