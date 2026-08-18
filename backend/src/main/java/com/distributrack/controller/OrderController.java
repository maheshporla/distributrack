package com.distributrack.controller;

import com.distributrack.dto.request.OrderRequest;
import com.distributrack.dto.response.OrderResponse;
import com.distributrack.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // Create Order
    @PostMapping
    public OrderResponse createOrder(
            @Valid @RequestBody OrderRequest request) {

        return orderService.createOrder(request);
    }

    // Get All Orders
    @GetMapping
    public List<OrderResponse> getAllOrders() {

        return orderService.getAllOrders();
    }

    // Get Orders For The Authenticated User
    @GetMapping("/my")
    public List<OrderResponse> getMyOrders() {

        return orderService.getMyOrders();
    }

    // Get Order By ID
    @GetMapping("/{id}")
    public OrderResponse getOrderById(
            @PathVariable Long id) {

        return orderService.getOrderById(id);
    }

    // Update Order Status
    @PutMapping("/{id}/status")
    public OrderResponse updateOrderStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        return orderService.updateOrderStatus(id, status);
    }

    // Delete Order
    @DeleteMapping("/{id}")
    public String deleteOrder(
            @PathVariable Long id) {

        orderService.deleteOrder(id);

        return "Order deleted successfully";
    }

    // Get Orders By Shopkeeper
    @GetMapping("/shopkeeper/{shopkeeperId}")
    public List<OrderResponse> getOrdersByShopkeeper(
            @PathVariable Long shopkeeperId) {

        return orderService.getOrdersByShopkeeper(shopkeeperId);
    }

    // Get Orders By Status
    @GetMapping("/status/{status}")
    public List<OrderResponse> getOrdersByStatus(
            @PathVariable String status) {

        return orderService.getOrdersByStatus(status);
    }
}