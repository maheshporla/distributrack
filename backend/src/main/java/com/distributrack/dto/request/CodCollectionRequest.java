package com.distributrack.dto.request;

import lombok.*;

/**
 * Submitted by the delivery boy to confirm cash collection for a COD order.
 * The backend calculates the outstanding amount — never trusts the frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodCollectionRequest {

    /** Optional confirmation notes from the delivery boy. */
    private String notes;
}
