package com.distributrack.service.impl;

import com.distributrack.dto.response.InvoiceResponse;
import com.distributrack.dto.response.OrderItemResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.User;
import com.distributrack.enums.InvoiceStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Invoices are derived, read-only views of orders joined with their
 * payments — there is no invoice table, so an invoice can never drift
 * out of sync with the order/items/payments it summarizes.
 *
 * Reconciliation: paidAmount = sum of SUCCESS payments; outstanding =
 * total - paid; invoiceStatus = UNPAID / PARTIALLY_PAID / PAID.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceServiceImpl implements InvoiceService {

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;

    @Override
    public List<InvoiceResponse> getAllInvoices() {

        User current = currentUserService.getCurrentUser();

        List<Order> orders;

        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            orders = orderRepository.findByShopkeeper(current);
        } else {
            orders = orderRepository.findAll();
        }

        return orders.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public InvoiceResponse getInvoiceByOrderId(Long orderId) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));

        User current = currentUserService.getCurrentUser();

        // SHOPKEEPER cannot view another shopkeeper's invoice.
        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !order.getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Order not found with id: " + orderId);
        }

        return mapToResponse(order);
    }

    private InvoiceResponse mapToResponse(Order order) {

        List<Payment> payments = paymentRepository.findByOrderOrderByIdAsc(order);

        BigDecimal paidAmount = payments.stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAmount = order.getTotalAmount();
        BigDecimal outstandingAmount = totalAmount.subtract(paidAmount);

        InvoiceStatus invoiceStatus;
        if (paidAmount.signum() <= 0) {
            invoiceStatus = InvoiceStatus.UNPAID;
        } else if (paidAmount.compareTo(totalAmount) >= 0) {
            invoiceStatus = InvoiceStatus.PAID;
        } else {
            invoiceStatus = InvoiceStatus.PARTIALLY_PAID;
        }

        // Latest payment (if any) drives the summary fields.
        Payment latest = payments.isEmpty() ? null : payments.get(payments.size() - 1);

        return InvoiceResponse.builder()
                .invoiceNumber("INV-" + order.getOrderNumber())
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .shopkeeperId(order.getShopkeeper().getId())
                .shopkeeperName(order.getShopkeeper().getFullName())
                .shopkeeperPhone(order.getShopkeeper().getPhone())
                .items(
                        order.getOrderItems()
                                .stream()
                                .map(item ->
                                        OrderItemResponse.builder()
                                                .productId(item.getProduct().getId())
                                                .productName(item.getProduct().getProductName())
                                                .quantity(item.getQuantity())
                                                .price(item.getPrice())
                                                .subtotal(item.getSubtotal())
                                                .build()
                                )
                                .collect(Collectors.toList())
                )
                .subtotal(totalAmount)
                .totalAmount(totalAmount)
                .orderStatus(order.getStatus())
                .orderDate(order.getOrderDate())
                .paidAmount(paidAmount)
                .outstandingAmount(outstandingAmount)
                .invoiceStatus(invoiceStatus)
                .paymentCount(payments.size())
                .paymentId(latest != null ? latest.getId() : null)
                .paymentStatus(latest != null ? latest.getPaymentStatus() : null)
                .paymentAmount(latest != null ? latest.getAmount() : null)
                .paymentMethod(latest != null ? latest.getPaymentMethod() : null)
                .transactionId(latest != null ? latest.getTransactionId() : null)
                .paymentDate(latest != null ? latest.getPaymentDate() : null)
                .build();
    }
}
