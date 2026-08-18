package com.distributrack.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Distributor identity configuration (prefix {@code app.distributor}).
 *
 * The UPI ID is used for direct UPI payments from shopkeepers.
 * It is read from the {@code DISTRIBUTOR_UPI_ID} environment variable
 * and must never be hardcoded in source files.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.distributor")
public class DistributorProperties {

    /** Distributor's UPI VPA (Virtual Payment Address), e.g. name@bank. */
    private String upiId = "";
}
