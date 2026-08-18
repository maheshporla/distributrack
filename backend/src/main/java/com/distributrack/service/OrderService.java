package com.distributrack.service;

import com.distributrack.dto.request.OrderRequest;
import com.distributrack.dto.response.OrderResponse;

import java.util.List;

public interface OrderService {

    // Create Order
    OrderResponse createOrder(OrderRequest request);

    // Get All Orders
    List<OrderResponse> getAllOrders();

    // Get Order By ID
    OrderResponse getOrderById(Long id);

    // Update Order Status
    OrderResponse updateOrderStatus(Long id, String status);

    // Delete Order
    void deleteOrder(Long id);

    // Get Orders By Shopkeeper
    List<OrderResponse> getOrdersByShopkeeper(Long shopkeeperId);

    // Get Orders By Status
    List<OrderResponse> getOrdersByStatus(String status);

    // Get Orders for the authenticated user
    List<OrderResponse> getMyOrders();
}