package com.distributrack.controller;

import com.distributrack.dto.response.AuditLogResponse;
import com.distributrack.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Audit trail — who performed which important action, and when.
 *
 * Access: SUPER_ADMIN and OWNER only (SecurityConfig). Read-only; audit
 * rows are written by the services themselves.
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public List<AuditLogResponse> getRecentLogs(
            @RequestParam(defaultValue = "50") int limit) {

        return auditService.getRecentLogs(limit);
    }

    @GetMapping("/entity")
    public List<AuditLogResponse> getLogsForEntity(
            @RequestParam String entityType,
            @RequestParam Long entityId,
            @RequestParam(defaultValue = "50") int limit) {

        return auditService.getLogsForEntity(entityType, entityId, limit);
    }
}
