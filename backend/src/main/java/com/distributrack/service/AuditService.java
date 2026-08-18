package com.distributrack.service;

import com.distributrack.dto.response.AuditLogResponse;

import java.util.List;

/**
 * Audit trail for important actions. Callers log WHAT happened with a
 * short human-readable detail string; the actor identity is resolved
 * from the authenticated JWT principal.
 */
public interface AuditService {

    void log(String action, String entityType, Long entityId, String details);

    List<AuditLogResponse> getRecentLogs(int limit);

    List<AuditLogResponse> getLogsForEntity(String entityType, Long entityId, int limit);
}
