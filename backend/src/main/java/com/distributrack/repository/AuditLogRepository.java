package com.distributrack.repository;

import com.distributrack.entity.AuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByOrderByCreatedAtDesc(Pageable pageable);

    List<AuditLog> findByEntityTypeIgnoreCaseOrderByCreatedAtDesc(String entityType, Pageable pageable);

    List<AuditLog> findByEntityTypeIgnoreCaseAndEntityIdOrderByCreatedAtDesc(
            String entityType, Long entityId, Pageable pageable);
}
