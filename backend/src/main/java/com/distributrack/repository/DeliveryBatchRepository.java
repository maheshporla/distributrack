package com.distributrack.repository;

import com.distributrack.entity.DeliveryBatch;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryBatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryBatchRepository extends JpaRepository<DeliveryBatch, Long> {

    List<DeliveryBatch> findByDeliveryBoy(User deliveryBoy);

    List<DeliveryBatch> findByDeliveryBoyOrderByAssignedAtDesc(User deliveryBoy);

    List<DeliveryBatch> findByStatus(DeliveryBatchStatus status);

    Optional<DeliveryBatch> findByDeliveryBoyAndStatus(User deliveryBoy, DeliveryBatchStatus status);

    List<DeliveryBatch> findByDeliveryBoyAndStatusIn(User deliveryBoy, List<DeliveryBatchStatus> statuses);

    boolean existsByDeliveryBoyAndStatusIn(User deliveryBoy, List<DeliveryBatchStatus> statuses);

    long countByDeliveryBoyAndStatusIn(User deliveryBoy, List<DeliveryBatchStatus> statuses);
}
