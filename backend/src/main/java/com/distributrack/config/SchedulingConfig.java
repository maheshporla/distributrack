package com.distributrack.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables @Scheduled methods — currently the periodic low-stock
 * notification scan in NotificationServiceImpl.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
