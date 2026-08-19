package com.distributrack.service.impl;

import com.distributrack.config.DistributorProperties;
import com.distributrack.dto.request.PaymentInitiationRequest;
import com.distributrack.dto.request.PaymentRequest;
import com.distributrack.dto.request.UpiPaymentSubmitRequest;
import com.distributrack.dto.request.VerifyPaymentRequest;
import com.distributrack.dto.response.PaymentInitiationResponse;
import com.distributrack.dto.response.PaymentResponse;
import com.distributrack.dto.response.PaymentSummaryResponse;
import com.distributrack.dto.response.UpiDetailsResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.User;
import com.distributrack.enums.InvoiceStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentChannel;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.payment.GatewayOrder;
import com.distributrack.payment.GatewayPayment;
import com.distributrack.payment.PaymentGateway;
import com.distributrack.payment.PaymentGatewayMode;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.PaymentService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Payments with real reconciliation:
 *
 *   TOTAL = order total | PAID = sum of SUCCESS payments | OUTSTANDING
 *
 * Three collection paths, all validated server-side:
 *   - MANUAL  — staff records cash/cheque/transfer (admin roles only)
 *   - GATEWAY — Razorpay checkout; recorded only after HMAC signature
 *               verification + gateway capture confirmation
 *   - MOCK    — built-in dev gateway; same verification mechanics
 *
 * Webhook processing is signature-verified and idempotent per gateway
 * payment id, so a retried delivery can never create a duplicate.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final PaymentGateway paymentGateway;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;
    private final DistributorProperties distributorProperties;

    // =========================================================
    // Manual payments
    // =========================================================

    @Override
    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {

        Order order = findOrder(request.getOrderId());

        assertDelivered(order);

        BigDecimal outstanding = outstandingAmount(order);

        if (request.getAmount().compareTo(outstanding) > 0) {
            throw new IllegalArgumentException(
                    "Payment amount cannot exceed the outstanding amount of " + outstanding
                            + " (order total " + order.getTotalAmount() + ")"
            );
        }

        Payment payment = Payment.builder()
                .order(order)
                .amount(request.getAmount())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId(UUID.randomUUID().toString())
                .paymentChannel(PaymentChannel.MANUAL)
                .notes("Manual payment")
                .build();

        payment = paymentRepository.save(payment);

        // Full settlement finalizes the order (DELIVERED -> COMPLETED).
        maybeCompleteOrder(order, paidAmount(order).add(payment.getAmount()));

        notificationService.notifyPaymentSuccess(payment);

        auditService.log("PAYMENT_CREATE", "Payment", payment.getId(),
                "Manual payment of " + payment.getAmount() + " for order "
                        + order.getOrderNumber() + " (" + request.getPaymentMethod() + ")");

        return mapToResponse(payment);
    }

    // =========================================================
    // Online payments (gateway)
    // =========================================================

    @Override
    @Transactional
    public PaymentInitiationResponse initiateGatewayPayment(PaymentInitiationRequest request) {

        User current = currentUserService.getCurrentUser();
        Order order = findOrder(request.getOrderId());

        assertCanPay(order, current);
        assertDelivered(order);

        BigDecimal outstanding = outstandingAmount(order);

        if (outstanding.signum() <= 0) {
            throw new IllegalStateException("Order " + order.getOrderNumber() + " is already fully paid");
        }

        if (request.getAmount().compareTo(outstanding) > 0) {
            throw new IllegalArgumentException(
                    "Amount cannot exceed the outstanding amount of " + outstanding
            );
        }

        GatewayOrder gatewayOrder = paymentGateway.createOrder(
                request.getAmount(),
                order.getOrderNumber(),
                "Payment for order " + order.getOrderNumber()
        );

        PaymentInitiationResponse response = PaymentInitiationResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .amount(request.getAmount())
                .currency(gatewayOrder.currency())
                .gatewayOrderId(gatewayOrder.gatewayOrderId())
                .mode(paymentGateway.mode())
                .keyId(paymentGateway.keyId())
                .build();

        // MOCK mode: the backend itself plays the gateway — it issues the
        // payment id + signature that the verify endpoint will validate,
        // so the "never trust the frontend" guarantee is still exercised.
        if (paymentGateway.mode() == PaymentGatewayMode.MOCK) {
            String mockPaymentId = "mock_pay_" + UUID.randomUUID().toString().substring(0, 12);
            response.setMockPaymentId(mockPaymentId);
            response.setMockSignature(
                    paymentGateway.createCheckoutSignature(gatewayOrder.gatewayOrderId(), mockPaymentId)
            );
        }

        return response;
    }

    @Override
    @Transactional
    public PaymentResponse verifyGatewayPayment(VerifyPaymentRequest request) {

        User current = currentUserService.getCurrentUser();
        Order order = findOrder(request.getOrderId());

        assertCanPay(order, current);

        // Idempotency: a gateway payment id is processed exactly once.
        // A retried callback (double click / network retry / webhook that
        // already settled the order) returns the already-recorded payment
        // instead of failing or creating a duplicate. Ownership is checked
        // above so one shopkeeper can never read another's payment.
        Optional<Payment> existing = paymentRepository
                .findByRazorpayPaymentId(request.getGatewayPaymentId());
        if (existing.isPresent()) {
            return mapToResponse(existing.get());
        }

        assertDelivered(order);

        BigDecimal outstanding = outstandingAmount(order);

        if (outstanding.signum() <= 0) {
            throw new IllegalStateException("Order " + order.getOrderNumber() + " is already fully paid");
        }

        if (request.getAmount().compareTo(outstanding) > 0) {
            throw new IllegalArgumentException(
                    "Amount cannot exceed the outstanding amount of " + outstanding
            );
        }

        // 1. Verify the checkout signature — never trust the frontend.
        if (!paymentGateway.verifyPaymentSignature(
                request.getGatewayOrderId(),
                request.getGatewayPaymentId(),
                request.getSignature())) {
            throw new IllegalArgumentException("Payment signature verification failed");
        }

        // 2. GATEWAY mode: confirm with Razorpay that the payment was
        //    actually captured and the amount matches.
        if (paymentGateway.mode() == PaymentGatewayMode.GATEWAY) {
            GatewayPayment gatewayPayment = paymentGateway.fetchPayment(request.getGatewayPaymentId());
            if (!gatewayPayment.captured()) {
                throw new IllegalStateException("Payment was not captured by the gateway");
            }
            long expectedPaise = toPaise(request.getAmount());
            if (gatewayPayment.amountPaise() != expectedPaise) {
                throw new IllegalArgumentException(
                        "Payment amount does not match the gateway record"
                );
            }
        }

        Payment payment = Payment.builder()
                .order(order)
                .amount(request.getAmount())
                .paymentMethod("ONLINE")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId(request.getGatewayPaymentId())
                .paymentChannel(paymentGateway.mode() == PaymentGatewayMode.MOCK
                        ? PaymentChannel.MOCK : PaymentChannel.GATEWAY)
                .razorpayOrderId(request.getGatewayOrderId())
                .razorpayPaymentId(request.getGatewayPaymentId())
                .razorpaySignature(request.getSignature())
                .notes("Verified gateway payment")
                .build();

        payment = paymentRepository.save(payment);

        maybeCompleteOrder(order, paidAmount(order).add(payment.getAmount()));

        notificationService.notifyPaymentSuccess(payment);

        auditService.log("PAYMENT_VERIFY", "Payment", payment.getId(),
                "Gateway payment of " + payment.getAmount() + " verified for order "
                        + order.getOrderNumber() + " (gateway payment " + request.getGatewayPaymentId() + ")");

        return mapToResponse(payment);
    }

    @Override
    @Transactional
    public PaymentResponse handleWebhook(String rawBody, String signature) {

        // The webhook endpoint is public, so the signature is the gate:
        // reject anything not signed by the gateway secret.
        if (!paymentGateway.verifyWebhookSignature(rawBody, signature)) {
            throw new IllegalArgumentException("Invalid webhook signature");
        }

        try {
            JsonNode root = objectMapper.readTree(rawBody);

            String event = root.path("event").asText("");
            JsonNode entity = root.path("payload").path("payment").path("entity");

            if (entity.isMissingNode() || entity.isNull()) {
                return null;
            }

            String gatewayPaymentId = entity.path("id").asText("");
            String gatewayOrderId = entity.path("order_id").asText("");
            String status = entity.path("status").asText("");

            if (!"payment.captured".equals(event) && !"captured".equals(status)) {
                log.info("Webhook ignored (not a captured payment): {}", event);
                return null;
            }

            // Idempotency: the same gateway payment id is processed once.
            Optional<Payment> existing = paymentRepository.findByRazorpayPaymentId(gatewayPaymentId);
            if (existing.isPresent()) {
                log.info("Webhook ignored (payment already processed): {}", gatewayPaymentId);
                return mapToResponse(existing.get());
            }

            // Route the gateway order back to this application's order.
            Optional<Payment> link = paymentRepository.findByRazorpayOrderId(gatewayOrderId);
            if (link.isEmpty()) {
                log.warn("Webhook ignored (no order matches gateway order {}): {}", gatewayOrderId, gatewayPaymentId);
                return null;
            }

            Order order = link.get().getOrder();

            if (order.getStatus() != OrderStatus.DELIVERED) {
                log.warn("Webhook ignored (order {} is not DELIVERED)", order.getOrderNumber());
                return null;
            }

            BigDecimal amount = BigDecimal.valueOf(entity.path("amount").asLong())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

            BigDecimal outstanding = outstandingAmount(order);
            if (amount.signum() <= 0 || amount.compareTo(outstanding) > 0) {
                log.warn("Webhook ignored (invalid amount {} for order {})", amount, order.getOrderNumber());
                return null;
            }

            Payment payment = Payment.builder()
                    .order(order)
                    .amount(amount)
                    .paymentMethod("ONLINE")
                    .paymentStatus(PaymentStatus.SUCCESS)
                    .transactionId(gatewayPaymentId)
                    .paymentChannel(paymentGateway.mode() == PaymentGatewayMode.MOCK
                            ? PaymentChannel.MOCK : PaymentChannel.GATEWAY)
                    .razorpayOrderId(gatewayOrderId)
                    .razorpayPaymentId(gatewayPaymentId)
                    .notes("Webhook: " + event)
                    .build();

            payment = paymentRepository.save(payment);

            maybeCompleteOrder(order, paidAmount(order).add(payment.getAmount()));

            notificationService.notifyPaymentSuccess(payment);

            auditService.log("PAYMENT_WEBHOOK", "Payment", payment.getId(),
                    "Webhook recorded payment of " + amount + " for order " + order.getOrderNumber());

            return mapToResponse(payment);
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Webhook processing failed: {}", ex.getMessage());
            return null;
        }
    }

    // =========================================================
    // UPI direct payment
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public UpiDetailsResponse getUpiDetails(Long orderId) {

        User current = currentUserService.getCurrentUser();
        Order order = findOrder(orderId);

        // SHOPKEEPER can only get UPI details for their own orders.
        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !order.getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Order not found with id: " + orderId);
        }

        assertDelivered(order);

        String upiId = distributorProperties.getUpiId();
        if (upiId == null || upiId.isBlank()) {
            throw new IllegalStateException(
                    "Distributor UPI ID is not configured. Set DISTRIBUTOR_UPI_ID environment variable."
            );
        }

        BigDecimal outstanding = outstandingAmount(order);

        // Build the UPI deep-link URI per the UPI specification.
        // pa  = payee VPA
        // pn  = payee name
        // am  = amount in INR
        // cu  = currency
        // tn  = transaction note
        String upiUri = String.format(
                "upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s",
                upiId,
                urlEncode("DistribuTrack"),
                outstanding.toPlainString(),
                urlEncode("Payment for " + order.getOrderNumber())
        );

        return UpiDetailsResponse.builder()
                .distributorName("DistribuTrack")
                .upiId(upiId)
                .amount(outstanding)
                .orderNumber(order.getOrderNumber())
                .orderId(order.getId())
                .upiUri(upiUri)
                .build();
    }

    @Override
    @Transactional
    public PaymentResponse submitUpiPayment(UpiPaymentSubmitRequest request) {

        User current = currentUserService.getCurrentUser();

        // Only SHOPKEEPER may submit a UPI payment.
        if (current.getRole().getName() != RoleName.SHOPKEEPER) {
            throw new IllegalStateException(
                    "Only SHOPKEEPER accounts may submit UPI payments."
            );
        }

        Order order = findOrder(request.getOrderId());

        assertCanPay(order, current);
        assertDelivered(order);

        BigDecimal outstanding = outstandingAmount(order);

        if (outstanding.signum() <= 0) {
            throw new IllegalStateException("Order " + order.getOrderNumber() + " is already fully paid");
        }

        // Trim and validate the UTR.
        String utr = request.getUtr().trim();
        if (utr.length() < 6 || utr.length() > 32) {
            throw new IllegalArgumentException("UTR must be between 6 and 32 characters");
        }

        // Prevent duplicate UTR submissions.
        if (paymentRepository.existsByUtr(utr)) {
            throw new IllegalArgumentException(
                    "This UTR has already been submitted. Each UTR can only be used once."
            );
        }

        // Create a PENDING_VERIFICATION payment — NOT auto-verified.
        // Admin must verify the UTR against the bank statement.
        Payment payment = Payment.builder()
                .order(order)
                .amount(outstanding)
                .paymentMethod("UPI")
                .paymentStatus(PaymentStatus.PENDING_VERIFICATION)
                .transactionId("UPI_" + UUID.randomUUID().toString().substring(0, 12))
                .paymentChannel(PaymentChannel.UPI)
                .utr(utr)
                .notes("UPI payment submitted by shopkeeper — awaiting admin verification")
                .build();

        payment = paymentRepository.save(payment);

        auditService.log("UPI_SUBMIT", "Payment", payment.getId(),
                "UPI payment of " + payment.getAmount() + " submitted for order "
                        + order.getOrderNumber() + " (UTR: " + utr + ") — pending verification");

        // Notify admin/distributor about the pending verification.
        notificationService.notifyUpiPaymentSubmitted(payment);

        return mapToResponse(payment);
    }

    // =========================================================
    // Admin verification (approve / reject)
    // =========================================================

    @Override
    @Transactional
    public PaymentResponse approvePayment(Long paymentId) {

        User admin = currentUserService.getCurrentUser();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + paymentId));

        if (payment.getPaymentStatus() != PaymentStatus.PENDING_VERIFICATION) {
            throw new IllegalStateException(
                    "Only PENDING_VERIFICATION payments can be approved (current: "
                            + payment.getPaymentStatus() + ")"
            );
        }

        payment.setPaymentStatus(PaymentStatus.SUCCESS);
        payment.setVerifiedBy(admin);
        payment.setVerifiedAt(java.time.LocalDateTime.now());
        payment = paymentRepository.save(payment);

        // Keep the order lifecycle in sync.
        maybeCompleteOrder(payment.getOrder(), paidAmount(payment.getOrder()).add(payment.getAmount()));

        notificationService.notifyUpiPaymentApproved(payment);

        auditService.log("UPI_APPROVE", "Payment", payment.getId(),
                "UPI payment of " + payment.getAmount() + " approved by "
                        + admin.getFullName() + " for order " + payment.getOrder().getOrderNumber());

        return mapToResponse(payment);
    }

    @Override
    @Transactional
    public PaymentResponse rejectPayment(Long paymentId, String reason) {

        User admin = currentUserService.getCurrentUser();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + paymentId));

        if (payment.getPaymentStatus() != PaymentStatus.PENDING_VERIFICATION) {
            throw new IllegalStateException(
                    "Only PENDING_VERIFICATION payments can be rejected (current: "
                            + payment.getPaymentStatus() + ")"
            );
        }

        if (reason == null || reason.trim().isBlank()) {
            throw new IllegalArgumentException("Rejection reason is required");
        }

        payment.setPaymentStatus(PaymentStatus.REJECTED);
        payment.setRejectionReason(reason.trim());
        payment.setVerifiedBy(admin);
        payment.setVerifiedAt(java.time.LocalDateTime.now());
        payment = paymentRepository.save(payment);

        notificationService.notifyUpiPaymentRejected(payment);

        auditService.log("UPI_REJECT", "Payment", payment.getId(),
                "UPI payment of " + payment.getAmount() + " rejected by "
                        + admin.getFullName() + " for order " + payment.getOrder().getOrderNumber()
                        + " (reason: " + reason.trim() + ")");

        return mapToResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPendingVerificationPayments() {
        List<Payment> pending = paymentRepository
                .findByPaymentStatusOrderByPaymentDateDesc(PaymentStatus.PENDING_VERIFICATION);
        return pending.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // Reconciliation
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public PaymentSummaryResponse getPaymentSummary(Long orderId) {

        User current = currentUserService.getCurrentUser();
        Order order = findOrder(orderId);

        // SHOPKEEPER can only reconcile their own orders.
        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !order.getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Order not found with id: " + orderId);
        }

        List<Payment> payments = paymentRepository.findByOrderOrderByIdAsc(order);

        BigDecimal paid = payments.stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outstanding = order.getTotalAmount().subtract(paid);

        return PaymentSummaryResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .shopkeeperId(order.getShopkeeper().getId())
                .shopkeeperName(order.getShopkeeper().getFullName())
                .totalAmount(order.getTotalAmount())
                .paidAmount(paid)
                .outstandingAmount(outstanding)
                .invoiceStatus(invoiceStatusFor(order.getTotalAmount(), paid))
                .payments(payments.stream().map(this::mapToResponse).collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Queries / lifecycle
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getAllPayments() {

        User current = currentUserService.getCurrentUser();

        List<Payment> payments;

        // SHOPKEEPER only ever sees payments for their own orders.
        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            payments = paymentRepository.findAll().stream()
                    .filter(p -> p.getOrder().getShopkeeper().getId().equals(current.getId()))
                    .toList();
        } else {
            payments = paymentRepository.findAll();
        }

        return payments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(Long id) {

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));

        assertCanView(payment);

        return mapToResponse(payment);
    }

    @Override
    @Transactional
    public PaymentResponse updatePaymentStatus(Long id, String status) {

        PaymentStatus nextStatus = parsePaymentStatus(status);

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));

        // Nothing to do when the status does not actually change.
        if (payment.getPaymentStatus() == nextStatus) {
            return mapToResponse(payment);
        }

        payment.setPaymentStatus(nextStatus);

        // Keep the order lifecycle in sync: a payment that becomes SUCCESS
        // settles a delivered order (DELIVERED -> COMPLETED) once the
        // order is fully paid.
        if (nextStatus == PaymentStatus.SUCCESS) {
            BigDecimal paidAfter = paidAmount(payment.getOrder());
            if (payment.getPaymentStatus() != PaymentStatus.SUCCESS) {
                paidAfter = paidAfter.add(payment.getAmount());
            }
            maybeCompleteOrder(payment.getOrder(), paidAfter);
        }

        payment = paymentRepository.save(payment);

        // Notify the shopkeeper about the payment outcome.
        switch (nextStatus) {
            case SUCCESS -> notificationService.notifyPaymentSuccess(payment);
            case FAILED -> notificationService.notifyPaymentFailed(payment);
            case REFUNDED -> notificationService.notifyPaymentRefunded(payment);
            default -> { }
        }

        auditService.log("PAYMENT_STATUS", "Payment", payment.getId(),
                "Payment status changed to " + nextStatus);

        return mapToResponse(payment);
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));

        Order order = payment.getOrder();
        boolean wasSuccess = payment.getPaymentStatus() == PaymentStatus.SUCCESS;

        paymentRepository.delete(payment);

        // Deleting a SUCCESS payment that had fully settled the order
        // must not leave the order stuck in COMPLETED while unpaid.
        if (wasSuccess && order.getStatus() == OrderStatus.COMPLETED
                && paidAmount(order).compareTo(order.getTotalAmount()) < 0) {
            order.setStatus(OrderStatus.DELIVERED);
            orderRepository.save(order);
        }

        auditService.log("PAYMENT_DELETE", "Payment", id,
                "Payment deleted for order " + order.getOrderNumber());
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByTransactionId(String transactionId) {

        Payment payment = paymentRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        assertCanView(payment);

        return mapToResponse(payment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByStatus(String status) {

        PaymentStatus paymentStatus = parsePaymentStatus(status);

        User current = currentUserService.getCurrentUser();

        List<Payment> payments;

        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            payments = paymentRepository.findAll().stream()
                    .filter(p -> p.getPaymentStatus() == paymentStatus
                            && p.getOrder().getShopkeeper().getId().equals(current.getId()))
                    .toList();
        } else {
            payments = paymentRepository.findByPaymentStatus(paymentStatus);
        }

        return payments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentResponse> getPaymentsByMethod(String paymentMethod) {

        User current = currentUserService.getCurrentUser();

        List<Payment> payments;

        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            payments = paymentRepository.findAll().stream()
                    .filter(p -> p.getPaymentMethod().equalsIgnoreCase(paymentMethod)
                            && p.getOrder().getShopkeeper().getId().equals(current.getId()))
                    .toList();
        } else {
            payments = paymentRepository.findByPaymentMethod(paymentMethod);
        }

        return payments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // =========================================================
    // Helpers
    // =========================================================

    private Order findOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));
    }

    private void assertDelivered(Order order) {
        // Payments are recorded against delivered orders only (the
        // Order -> Delivery -> Delivered -> Payment -> Invoice flow).
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException(
                    "Payment can only be recorded for a DELIVERED order (current status: "
                            + order.getStatus() + ")"
            );
        }
    }

    /** SHOPKEEPER may only pay for their own orders. */
    private void assertCanPay(Order order, User current) {
        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !order.getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Order not found with id: " + order.getId());
        }
    }

    /** SHOPKEEPER may only view payments belonging to their own orders. */
    private void assertCanView(Payment payment) {

        User current = currentUserService.getCurrentUser();

        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !payment.getOrder().getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Payment not found with id: " + payment.getId());
        }
    }

    /** Sum of SUCCESS payments for an order. */
    private BigDecimal paidAmount(Order order) {
        return paymentRepository.findByOrderOrderByIdAsc(order).stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal outstandingAmount(Order order) {
        return order.getTotalAmount().subtract(paidAmount(order));
    }

    /**
     * A delivered order becomes COMPLETED the moment its SUCCESS payments
     * cover the full total. Partial payments keep it DELIVERED so more
     * payments can be collected.
     */
    private void maybeCompleteOrder(Order order, BigDecimal paidAfter) {
        if (order.getStatus() == OrderStatus.DELIVERED
                && paidAfter.compareTo(order.getTotalAmount()) >= 0) {
            order.transitionTo(OrderStatus.COMPLETED);
            orderRepository.save(order);
        }
    }

    private InvoiceStatus invoiceStatusFor(BigDecimal total, BigDecimal paid) {
        if (paid.signum() <= 0) {
            return InvoiceStatus.UNPAID;
        }
        return paid.compareTo(total) >= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    }

    private PaymentStatus parsePaymentStatus(String status) {
        try {
            return PaymentStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid payment status: " + status);
        }
    }

    private static long toPaise(BigDecimal amountInr) {
        return amountInr.multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact();
    }

    /** URL-encode a string for the UPI URI. */
    private static String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return value;
        }
    }

    private PaymentResponse mapToResponse(Payment payment) {

        return PaymentResponse.builder()
                .id(payment.getId())
                .orderId(payment.getOrder().getId())
                .orderNumber(payment.getOrder().getOrderNumber())
                .shopkeeperId(payment.getOrder().getShopkeeper().getId())
                .shopkeeperName(payment.getOrder().getShopkeeper().getFullName())
                .orderTotalAmount(payment.getOrder().getTotalAmount())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .paymentStatus(payment.getPaymentStatus())
                .paymentChannel(payment.getPaymentChannel() != null
                        ? payment.getPaymentChannel() : PaymentChannel.MANUAL)
                .transactionId(payment.getTransactionId())
                .utr(payment.getUtr())
                .rejectionReason(payment.getRejectionReason())
                .verifiedByName(payment.getVerifiedBy() != null
                        ? payment.getVerifiedBy().getFullName() : null)
                .verifiedAt(payment.getVerifiedAt())
                .paymentDate(payment.getPaymentDate())
                .build();
    }
}
