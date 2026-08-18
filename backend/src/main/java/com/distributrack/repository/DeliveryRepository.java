package com.distributrack.repository;

import com.distributrack.entity.Delivery;
import com.distributrack.entity.Order;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByOrder(Order order);

    List<Delivery> findByDeliveryBoy(User deliveryBoy);

    List<Delivery> findByDeliveryStatus(DeliveryStatus deliveryStatus);
}