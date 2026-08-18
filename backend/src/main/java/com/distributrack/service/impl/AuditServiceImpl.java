package com.distributrack.service.impl;

import com.distributrack.dto.response.AuditLogResponse;
import com.distributrack.entity.AuditLog;
import com.distributrack.entity.User;
import com.distributrack.repository.AuditLogRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Audit trail implementation. Logging is best-effort by design: a
 * failure to persist an audit row must NEVER break the business action
 * being audited. Each write runs in its own short REQUIRES_NEW
 * transaction via {@link TransactionTemplate} and any failure is caught
 * outside that transaction, so a constraint violation can never mark
 * the surrounding business transaction rollback-only.
 */
@Slf4j
@Service
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;
    private final TransactionTemplate transactionTemplate;

    public AuditServiceImpl(AuditLogRepository auditLogRepository,
                            CurrentUserService currentUserService,
                            PlatformTransactionManager transactionManager) {
        this.auditLogRepository = auditLogRepository;
        this.currentUserService = currentUserService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(
                org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );
    }

    @Override
    public void log(String action, String entityType, Long entityId, String details) {

        try {
            transactionTemplate.executeWithoutResult(status -> {

                User actor = null;
                try {
                    actor = currentUserService.getCurrentUser();
                } catch (Exception ignored) {
                    // System-initiated flow without an authenticated actor.
                }

                AuditLog entry = AuditLog.builder()
                        .actorId(actor != null ? actor.getId() : null)
                        .actorName(actor != null && actor.getFullName() != null
                                ? actor.getFullName() : "SYSTEM")
                        .actorRole(actor != null && actor.getRole() != null
                                ? actor.getRole().getName().name() : "SYSTEM")
                        .action(action)
                        .entityType(entityType)
                        .entityId(entityId)
                        .details(details != null ? details : "")
                        .build();

                auditLogRepository.save(entry);
            });
        } catch (Exception ex) {
            log.warn("Audit log failed (swallowed): {} - {}: {}", action, entityType, ex.getMessage());
        }
    }

    @Override
    public List<AuditLogResponse> getRecentLogs(int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 200));
        return auditLogRepository.findByOrderByCreatedAtDesc(pageable)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<AuditLogResponse> getLogsForEntity(String entityType, Long entityId, int limit) {
        Pageable pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 200));
        return auditLogRepository
                .findByEntityTypeIgnoreCaseAndEntityIdOrderByCreatedAtDesc(entityType, entityId, pageable)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    private AuditLogResponse mapToResponse(AuditLog entry) {
        return AuditLogResponse.builder()
                .id(entry.getId())
                .actorId(entry.getActorId())
                .actorName(entry.getActorName())
                .actorRole(entry.getActorRole())
                .action(entry.getAction())
                .entityType(entry.getEntityType())
                .entityId(entry.getEntityId())
                .details(entry.getDetails())
                .createdAt(entry.getCreatedAt())
                .build();
    }
}
