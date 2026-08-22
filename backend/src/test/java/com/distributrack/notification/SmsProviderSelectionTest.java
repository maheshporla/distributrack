package com.distributrack.notification;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression test: proves that the {@code app.sms.provider} property
 * correctly selects the right {@link SmsProvider} implementation.
 *
 * Root cause of production issue: {@code SMS_PROVIDER} was not set in
 * Railway, so the default "log" activated {@link LoggingSmsProvider}
 * instead of {@link TwilioSmsProvider}.
 */
class SmsProviderSelectionTest {

    @Configuration
    @ComponentScan(basePackageClasses = SmsProvider.class)
    static class SmsContext {}

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(SmsContext.class));

    @Test
    void loggingProviderSelectedByDefault() {
        // When app.sms.provider is absent, LoggingSmsProvider activates
        // because of matchIfMissing=true.
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(SmsContext.class))
                .run(context -> {
                    assertThat(context).hasSingleBean(LoggingSmsProvider.class);
                    assertThat(context).doesNotHaveBean(TwilioSmsProvider.class);
                    assertThat(context).hasSingleBean(SmsService.class);
                });
    }

    @Test
    void loggingProviderSelectedWhenExplicitLog() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(SmsContext.class))
                .withPropertyValues("app.sms.provider=log")
                .run(context -> {
                    assertThat(context).hasSingleBean(LoggingSmsProvider.class);
                    assertThat(context).doesNotHaveBean(TwilioSmsProvider.class);
                });
    }

    @Test
    void twilioProviderSelectedWhenConfigured() {
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(SmsContext.class))
                .withPropertyValues("app.sms.provider=twilio")
                .run(context -> {
                    assertThat(context).hasSingleBean(TwilioSmsProvider.class);
                    assertThat(context).doesNotHaveBean(LoggingSmsProvider.class);
                    assertThat(context).hasSingleBean(SmsProvider.class);
                });
    }

    @Test
    void loggingProviderNotSelectedWhenTwilioConfigured() {
        // CRITICAL REGRESSION TEST:
        // When SMS_PROVIDER=twilio, LoggingSmsProvider must NOT be active.
        // This was the production bug: the mock provider was always selected.
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(SmsContext.class))
                .withPropertyValues("app.sms.provider=twilio")
                .run(context -> {
                    assertThat(context).hasSingleBean(TwilioSmsProvider.class);
                    assertThat(context).doesNotHaveBean(LoggingSmsProvider.class);
                    assertThat(context).hasSingleBean(SmsProvider.class);
                });
    }

    @Test
    void twilioProviderNotSelectedWhenLogConfigured() {
        // When provider=log, TwilioSmsProvider must NOT be active.
        new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(SmsContext.class))
                .withPropertyValues("app.sms.provider=log")
                .run(context -> {
                    assertThat(context).hasSingleBean(LoggingSmsProvider.class);
                    assertThat(context).doesNotHaveBean(TwilioSmsProvider.class);
                });
    }
}
