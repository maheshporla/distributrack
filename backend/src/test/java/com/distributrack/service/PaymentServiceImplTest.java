package com.distributrack.service;

import com.distributrack.config.DistributorProperties;
import com.distributrack.dto.request.PaymentInitiationRequest;
import com.distributrack.dto.request.PaymentRequest;
import com.distributrack.dto.request.VerifyPaymentRequest;
import com.distributrack.dto.response.PaymentInitiationResponse;
import com.distributrack.dto.response.PaymentResponse;
import com.distributrack.dto.response.PaymentSummaryResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.InvoiceStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentChannel;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.payment.GatewayOrder;
import com.distributrack.payment.PaymentGateway;
import com.distributrack.payment.PaymentGatewayMode;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.PaymentServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceImplTest {

    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final PaymentGateway paymentGateway = mock(PaymentGateway.class);
    private final AuditService auditService = mock(AuditService.class);
    private final DistributorProperties distributorProperties = new DistributorProperties();

    private final PaymentServiceImpl paymentService = new PaymentServiceImpl(
            paymentRepository,
            orderRepository,
            currentUserService,
            notificationService,
            paymentGateway,
            auditService,
            new ObjectMapper(),
            distributorProperties
    );

    private User shopkeeper;
    private User otherShopkeeper;
    private Order deliveredOrder;

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

        deliveredOrder = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(shopkeeper)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(1000))
                .build();

        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentGateway.mode()).thenReturn(PaymentGatewayMode.MOCK);
        when(paymentGateway.createOrder(any(), any(), any()))
                .thenReturn(new GatewayOrder("mock_ord_1", "INR", 100000));
    }

    private Payment paymentFor(User orderOwner, PaymentStatus status) {
        Order order = Order.builder()
                .id(7L)
                .orderNumber("ORD-PAY")
                .shopkeeper(orderOwner)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(500))
                .build();
        return Payment.builder()
                .id(9L)
                .order(order)
                .amount(BigDecimal.valueOf(500))
                .paymentMethod("CASH")
                .paymentStatus(status)
                .transactionId("TXN-1")
                .build();
    }

    // ---------------------------------------------------------
    // Scoping
    // ---------------------------------------------------------

    @Test
    void shopkeeperSeesOnlyTheirOwnPayments() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(paymentRepository.findAll()).thenReturn(
                List.of(
                        paymentFor(shopkeeper, PaymentStatus.SUCCESS),
                        paymentFor(otherShopkeeper, PaymentStatus.SUCCESS)
                )
        );

        List<PaymentResponse> payments = paymentService.getAllPayments();

        assertEquals(1, payments.size());
        assertEquals("Shop One", payments.get(0).getShopkeeperName());
    }

    @Test
    void shopkeeperCannotViewAnotherShopkeepersPayment() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(paymentRepository.findById(9L))
                .thenReturn(Optional.of(paymentFor(otherShopkeeper, PaymentStatus.SUCCESS)));

        assertThrows(RuntimeException.class,
                () -> paymentService.getPaymentById(9L));
    }

    // ---------------------------------------------------------
    // Manual payments + reconciliation
    // ---------------------------------------------------------

    @Test
    void overpaymentIsRejected() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());

        PaymentRequest request = PaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(1001))
                .paymentMethod("CASH")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.createPayment(request));
    }

    @Test
    void paymentRequiresDeliveredOrder() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        Order pendingOrder = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(shopkeeper)
                .status(OrderStatus.APPROVED)
                .totalAmount(BigDecimal.valueOf(1000))
                .build();

        when(orderRepository.findById(5L)).thenReturn(Optional.of(pendingOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(pendingOrder)).thenReturn(List.of());

        PaymentRequest request = PaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(500))
                .paymentMethod("CASH")
                .build();

        assertThrows(IllegalStateException.class,
                () -> paymentService.createPayment(request));
    }

    @Test
    void fullPaymentFinalizesDeliveredOrder() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());

        PaymentRequest request = PaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(1000))
                .paymentMethod("UPI")
                .build();

        PaymentResponse response = paymentService.createPayment(request);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        assertEquals(BigDecimal.valueOf(1000), response.getAmount());
        assertEquals(PaymentChannel.MANUAL, response.getPaymentChannel());
        assertEquals(OrderStatus.COMPLETED, deliveredOrder.getStatus());
        assertNotNull(response.getTransactionId());
        verify(orderRepository).save(deliveredOrder);
    }

    @Test
    void partialPaymentKeepsOrderDelivered() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        // A previous 400 payment already exists.
        Payment existing = Payment.builder()
                .id(1L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(400))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod("CASH")
                .transactionId("TXN-PREV")
                .build();
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder))
                .thenReturn(List.of(existing));

        PaymentRequest request = PaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(200))
                .paymentMethod("UPI")
                .build();

        PaymentResponse response = paymentService.createPayment(request);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        // Not fully paid yet — the order stays DELIVERED.
        assertEquals(OrderStatus.DELIVERED, deliveredOrder.getStatus());
        verify(orderRepository, never()).save(deliveredOrder);
    }

    // ---------------------------------------------------------
    // Gateway initiation
    // ---------------------------------------------------------

    @Test
    void shopkeeperCannotPayAnotherShopkeepersOrder() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        Order otherOrder = Order.builder()
                .id(6L)
                .orderNumber("ORD-OTHER")
                .shopkeeper(otherShopkeeper)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(500))
                .build();
        when(orderRepository.findById(6L)).thenReturn(Optional.of(otherOrder));

        assertThrows(RuntimeException.class,
                () -> paymentService.initiateGatewayPayment(
                        PaymentInitiationRequest.builder().orderId(6L).amount(BigDecimal.valueOf(500)).build()));
    }

    @Test
    void initiateReturnsMockPaymentIdAndSignatureInMockMode() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());
        when(paymentGateway.createCheckoutSignature(any(), any())).thenReturn("mock-sig");

        PaymentInitiationResponse response = paymentService.initiateGatewayPayment(
                PaymentInitiationRequest.builder().orderId(5L).amount(BigDecimal.valueOf(1000)).build());

        assertEquals(PaymentGatewayMode.MOCK, response.getMode());
        assertNotNull(response.getGatewayOrderId());
        assertNotNull(response.getMockPaymentId());
        assertEquals("mock-sig", response.getMockSignature());
        assertNull(response.getKeyId());
    }

    @Test
    void initiateRejectsAmountAboveOutstanding() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        Payment existing = Payment.builder()
                .id(1L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(600))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod("CASH")
                .transactionId("TXN-PREV")
                .build();
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder))
                .thenReturn(List.of(existing));

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.initiateGatewayPayment(
                        PaymentInitiationRequest.builder()
                                .orderId(5L)
                                .amount(BigDecimal.valueOf(500)) // outstanding is 400
                                .build()));
    }

    // ---------------------------------------------------------
    // Gateway verification
    // ---------------------------------------------------------

    @Test
    void verifyRejectsBadSignature() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());
        when(paymentGateway.verifyPaymentSignature(any(), any(), any())).thenReturn(false);

        VerifyPaymentRequest request = VerifyPaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(1000))
                .gatewayOrderId("mock_ord_1")
                .gatewayPaymentId("mock_pay_1")
                .signature("forged")
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.verifyGatewayPayment(request));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    @Test
    void verifyRecordsPaymentAndFinalizesWhenFullyPaid() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());
        when(paymentRepository.findByRazorpayPaymentId(any())).thenReturn(Optional.empty());
        when(paymentGateway.verifyPaymentSignature(any(), any(), any())).thenReturn(true);

        VerifyPaymentRequest request = VerifyPaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(1000))
                .gatewayOrderId("mock_ord_1")
                .gatewayPaymentId("mock_pay_1")
                .signature("ok")
                .build();

        PaymentResponse response = paymentService.verifyGatewayPayment(request);

        assertEquals(PaymentStatus.SUCCESS, response.getPaymentStatus());
        assertEquals(PaymentChannel.MOCK, response.getPaymentChannel());
        assertEquals("mock_pay_1", response.getTransactionId());
        assertEquals(OrderStatus.COMPLETED, deliveredOrder.getStatus());
        verify(notificationService).notifyPaymentSuccess(any(Payment.class));
    }

    @Test
    void verifyIsIdempotentPerGatewayPaymentId() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));

        Payment recorded = Payment.builder()
                .id(77L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(1000))
                .paymentMethod("ONLINE")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("mock_pay_dup")
                .build();
        when(paymentRepository.findByRazorpayPaymentId("mock_pay_dup"))
                .thenReturn(Optional.of(recorded));

        VerifyPaymentRequest request = VerifyPaymentRequest.builder()
                .orderId(5L)
                .amount(BigDecimal.valueOf(1000))
                .gatewayOrderId("mock_ord_1")
                .gatewayPaymentId("mock_pay_dup")
                .signature("ok")
                .build();

        PaymentResponse response = paymentService.verifyGatewayPayment(request);

        assertEquals("mock_pay_dup", response.getTransactionId());
        // No duplicate save.
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    // ---------------------------------------------------------
    // Webhook
    // ---------------------------------------------------------

    private static final String CAPTURED_WEBHOOK = """
            {
              "event": "payment.captured",
              "payload": {
                "payment": {
                  "entity": {
                    "id": "pay_wh_1",
                    "order_id": "order_wh_1",
                    "amount": 100000,
                    "status": "captured"
                  }
                }
              }
            }
            """;

    @Test
    void webhookRejectsBadSignature() {

        when(paymentGateway.verifyWebhookSignature(any(), any())).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.handleWebhook(CAPTURED_WEBHOOK, "forged"));
    }

    @Test
    void webhookRecordsPaymentAndIsIdempotent() {

        when(paymentGateway.verifyWebhookSignature(any(), any())).thenReturn(true);
        when(paymentRepository.findByRazorpayPaymentId("pay_wh_1")).thenReturn(Optional.empty());
        Payment link = Payment.builder()
                .id(1L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(1000))
                .paymentMethod("ONLINE")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("txn-link")
                .razorpayOrderId("order_wh_1")
                .build();
        when(paymentRepository.findByRazorpayOrderId("order_wh_1"))
                .thenReturn(Optional.of(link));
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder)).thenReturn(List.of());

        PaymentResponse first = paymentService.handleWebhook(CAPTURED_WEBHOOK, "sig");
        assertNotNull(first);
        assertEquals("pay_wh_1", first.getTransactionId());
        assertEquals(PaymentStatus.SUCCESS, first.getPaymentStatus());
        assertEquals(OrderStatus.COMPLETED, deliveredOrder.getStatus());

        // A redelivered webhook returns the same payment without saving again.
        when(paymentRepository.findByRazorpayPaymentId("pay_wh_1"))
                .thenReturn(Optional.of(Payment.builder()
                        .id(2L)
                        .order(deliveredOrder)
                        .amount(BigDecimal.valueOf(1000))
                        .paymentMethod("ONLINE")
                        .paymentStatus(PaymentStatus.SUCCESS)
                        .transactionId("pay_wh_1")
                        .build()));

        PaymentResponse second = paymentService.handleWebhook(CAPTURED_WEBHOOK, "sig");

        assertEquals("pay_wh_1", second.getTransactionId());
        // Only one save happened (first processing).
        verify(paymentRepository, times(1)).save(any(Payment.class));
    }

    @Test
    void webhookIgnoresNonCapturedEvents() {

        String failed = """
                {
                  "event": "payment.failed",
                  "payload": {
                    "payment": {
                      "entity": {
                        "id": "pay_f_1",
                        "order_id": "order_wh_1",
                        "amount": 100000,
                        "status": "failed"
                      }
                    }
                  }
                }
                """;

        when(paymentGateway.verifyWebhookSignature(any(), any())).thenReturn(true);

        assertNull(paymentService.handleWebhook(failed, "sig"));
        verify(paymentRepository, never()).save(any(Payment.class));
    }

    // ---------------------------------------------------------
    // Reconciliation summary
    // ---------------------------------------------------------

    @Test
    void paymentSummaryShowsPartialSettlement() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(deliveredOrder));
        Payment first = Payment.builder()
                .id(1L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(400))
                .paymentStatus(PaymentStatus.SUCCESS)
                .paymentMethod("UPI")
                .transactionId("TXN-1")
                .build();
        Payment second = Payment.builder()
                .id(2L)
                .order(deliveredOrder)
                .amount(BigDecimal.valueOf(200))
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod("CASH")
                .transactionId("TXN-2")
                .build();
        when(paymentRepository.findByOrderOrderByIdAsc(deliveredOrder))
                .thenReturn(List.of(first, second));

        PaymentSummaryResponse summary = paymentService.getPaymentSummary(5L);

        assertEquals(BigDecimal.valueOf(1000), summary.getTotalAmount());
        assertEquals(BigDecimal.valueOf(400), summary.getPaidAmount());
        assertEquals(BigDecimal.valueOf(600), summary.getOutstandingAmount());
        assertEquals(InvoiceStatus.PARTIALLY_PAID, summary.getInvoiceStatus());
        assertEquals(2, summary.getPayments().size());
    }

    @Test
    void shopkeeperCannotReconcileAnotherShopkeepersOrder() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        Order otherOrder = Order.builder()
                .id(6L)
                .orderNumber("ORD-OTHER")
                .shopkeeper(otherShopkeeper)
                .status(OrderStatus.DELIVERED)
                .totalAmount(BigDecimal.valueOf(500))
                .build();
        when(orderRepository.findById(6L)).thenReturn(Optional.of(otherOrder));

        assertThrows(RuntimeException.class,
                () -> paymentService.getPaymentSummary(6L));
    }

    @Test
    void invalidPaymentStatusIsRejected() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(paymentRepository.findById(9L))
                .thenReturn(Optional.of(paymentFor(shopkeeper, PaymentStatus.PENDING)));

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.updatePaymentStatus(9L, "NOT_A_STATUS"));
    }
}
