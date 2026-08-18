package com.distributrack.service;

import com.distributrack.dto.response.InvoiceResponse;
import com.distributrack.entity.*;
import com.distributrack.enums.InvoiceStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.InvoiceServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InvoiceServiceImplTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);

    private final InvoiceServiceImpl invoiceService = new InvoiceServiceImpl(
            orderRepository,
            paymentRepository,
            currentUserService
    );

    private User shopkeeper;
    private User otherShopkeeper;

    @BeforeEach
    void setUp() {
        shopkeeper = User.builder()
                .id(1L)
                .fullName("Shop One")
                .email("shop1@test.com")
                .phone("9000000000")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        otherShopkeeper = User.builder()
                .id(2L)
                .fullName("Shop Two")
                .email("shop2@test.com")
                .phone("9000000001")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();
    }

    private Order orderFor(User orderOwner, boolean withItems) {
        Product product = Product.builder()
                .id(1L)
                .productName("Rice 5kg")
                .price(BigDecimal.valueOf(500))
                .build();

        OrderItem item = OrderItem.builder()
                .id(1L)
                .product(product)
                .quantity(2)
                .price(BigDecimal.valueOf(500))
                .subtotal(BigDecimal.valueOf(1000))
                .build();

        Order order = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(orderOwner)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(1000))
                .orderItems(withItems ? List.of(item) : List.of())
                .build();

        return order;
    }

    @Test
    void shopkeeperSeesOnlyTheirOwnInvoices() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findByShopkeeper(shopkeeper))
                .thenReturn(List.of(orderFor(shopkeeper, false)));

        List<InvoiceResponse> invoices = invoiceService.getAllInvoices();

        assertEquals(1, invoices.size());
        assertEquals("Shop One", invoices.get(0).getShopkeeperName());
        verify(orderRepository, never()).findAll();
    }

    @Test
    void shopkeeperCannotViewAnotherShopkeepersInvoice() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L))
                .thenReturn(Optional.of(orderFor(otherShopkeeper, false)));

        assertThrows(RuntimeException.class,
                () -> invoiceService.getInvoiceByOrderId(5L));
    }

    @Test
    void invoiceDerivesItemsAndPayment() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        Order order = orderFor(shopkeeper, true);
        Payment payment = Payment.builder()
                .id(9L)
                .order(order)
                .amount(BigDecimal.valueOf(1000))
                .paymentMethod("UPI")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("TXN-123")
                .build();

        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderOrderByIdAsc(order)).thenReturn(List.of(payment));

        InvoiceResponse invoice = invoiceService.getInvoiceByOrderId(5L);

        assertEquals("INV-ORD-TEST", invoice.getInvoiceNumber());
        assertEquals(1, invoice.getItems().size());
        assertEquals("Rice 5kg", invoice.getItems().get(0).getProductName());
        assertEquals(BigDecimal.valueOf(1000), invoice.getSubtotal());
        assertEquals(BigDecimal.valueOf(1000), invoice.getTotalAmount());
        assertEquals(PaymentStatus.SUCCESS, invoice.getPaymentStatus());
        assertEquals("TXN-123", invoice.getTransactionId());
        // Reconciliation: fully paid.
        assertEquals(BigDecimal.valueOf(1000), invoice.getPaidAmount());
        assertEquals(BigDecimal.valueOf(0), invoice.getOutstandingAmount());
        assertEquals(InvoiceStatus.PAID, invoice.getInvoiceStatus());
    }

    @Test
    void partialPaymentsProducePartiallyPaidInvoice() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        Order order = orderFor(shopkeeper, false);
        Payment first = Payment.builder()
                .id(1L)
                .order(order)
                .amount(BigDecimal.valueOf(400))
                .paymentMethod("UPI")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("TXN-1")
                .build();
        Payment second = Payment.builder()
                .id(2L)
                .order(order)
                .amount(BigDecimal.valueOf(200))
                .paymentMethod("CASH")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("TXN-2")
                .build();

        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderOrderByIdAsc(order)).thenReturn(List.of(first, second));

        InvoiceResponse invoice = invoiceService.getInvoiceByOrderId(5L);

        assertEquals(BigDecimal.valueOf(600), invoice.getPaidAmount());
        assertEquals(BigDecimal.valueOf(400), invoice.getOutstandingAmount());
        assertEquals(InvoiceStatus.PARTIALLY_PAID, invoice.getInvoiceStatus());
        assertEquals(2, invoice.getPaymentCount());
        // Latest payment drives the summary fields.
        assertEquals("TXN-2", invoice.getTransactionId());
    }

    @Test
    void unpaidOrderHasNullPaymentFields() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        Order order = orderFor(shopkeeper, false);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderOrderByIdAsc(order)).thenReturn(List.of());

        InvoiceResponse invoice = invoiceService.getInvoiceByOrderId(5L);

        assertNull(invoice.getPaymentId());
        assertNull(invoice.getPaymentStatus());
        assertEquals(BigDecimal.valueOf(0), invoice.getPaidAmount());
        assertEquals(BigDecimal.valueOf(1000), invoice.getOutstandingAmount());
        assertEquals(InvoiceStatus.UNPAID, invoice.getInvoiceStatus());
    }
}
