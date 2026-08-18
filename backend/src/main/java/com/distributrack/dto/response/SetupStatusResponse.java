package com.distributrack.dto.response;

import lombok.*;

/**
 * Tells the client whether the first-admin setup flow is still open.
 * It is open only while the users table is completely empty (a fresh
 * system). Once the first SUPER_ADMIN exists, setupRequired is false and
 * the setup endpoint rejects all calls.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SetupStatusResponse {

    private boolean setupRequired;
}
