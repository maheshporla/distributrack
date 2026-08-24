package com.distributrack.repository;

import com.distributrack.entity.Notification;
import com.distributrack.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);

    List<Notification> findByRecipientAndReadFalseOrderByCreatedAtDesc(User recipient);

    long countByRecipientAndReadFalse(User recipient);

    boolean existsByRecipientAndDedupeKeyAndReadFalse(User recipient, String dedupeKey);

    /** Marks every unread notification of the recipient as read. */
    @Modifying
    @Query("update Notification n set n.read = true "
            + "where n.recipient = :recipient and n.read = false")
    int markAllRead(@Param("recipient") User recipient);

    /** Deletes all notifications for the given recipient. */
    void deleteByRecipient(User recipient);
}
