package com.distributrack.controller;

import com.distributrack.dto.response.NotificationResponse;
import com.distributrack.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * In-app notifications for the authenticated user.
 *
 * Access: any authenticated role (SecurityConfig). Ownership is enforced
 * in the service through the JWT principal — the API never accepts a
 * userId, so a user can only ever list/read their own notifications.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> getMyNotifications() {
        return notificationService.getMyNotifications();
    }

    @GetMapping("/unread-count")
    public long getUnreadCount() {
        return notificationService.getUnreadCount();
    }

    @PutMapping("/{id}/read")
    public NotificationResponse markAsRead(@PathVariable Long id) {
        return notificationService.markAsRead(id);
    }

    @PutMapping("/read-all")
    public long markAllAsRead() {
        return notificationService.markAllAsRead();
    }
}
