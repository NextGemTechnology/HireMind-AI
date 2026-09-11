package com.talentiq.controller.subscription;

import com.talentiq.common.enums.TargetRole;
import com.talentiq.common.response.ApiResponse;
import com.talentiq.dto.subscription.SubscriptionDto.*;
import com.talentiq.security.userdetails.UserPrincipal;
import com.talentiq.service.subscription.SubscriptionService;
import com.talentiq.service.subscription.WebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/v1/subscriptions")
@RequiredArgsConstructor
@Tag(name = "Subscription and Billing", description = "Endpoints for managing subscription plans and payments")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final WebhookService webhookService;

    // ── Public Plan Endpoints ───────────────────────────────────────────────

    @GetMapping("/plans")
    @Operation(summary = "Get all active subscription plans")
    public ResponseEntity<ApiResponse<List<PlanResponse>>> getPlans(
            @RequestParam(required = false) TargetRole role) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getPlans(role)));
    }

    @GetMapping("/plans/{code}")
    @Operation(summary = "Get subscription plan details by plan code")
    public ResponseEntity<ApiResponse<PlanResponse>> getPlanByCode(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.success(subscriptionService.getPlanByCode(code)));
    }

    // ── Authenticated Subscription Endpoints ────────────────────────────────

    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get the current user's active subscription")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> getMySubscription(
            @AuthenticationPrincipal UserPrincipal principal) {
        SubscriptionResponse response = subscriptionService.getMySubscription(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/purchase")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Initiate a purchase / create a payment order")
    public ResponseEntity<ApiResponse<CreateOrderResponse>> initiatePurchase(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InitiatePurchaseRequest request) {
        CreateOrderResponse response = subscriptionService.initiatePurchase(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Order created successfully", response));
    }

    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Verify gateway payment and activate subscription")
    public ResponseEntity<ApiResponse<SubscriptionResponse>> verifyPayment(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody VerifyPaymentRequest request) {
        SubscriptionResponse response = subscriptionService.verifyAndActivate(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Payment verified and subscription activated", response));
    }

    @PostMapping("/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel current active subscription")
    public ResponseEntity<ApiResponse<Void>> cancelSubscription(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CancelRequest request) {
        subscriptionService.cancelSubscription(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Subscription cancelled successfully"));
    }

    @GetMapping("/transactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get transaction history for the current user")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getTransactionHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TransactionResponse> history = subscriptionService.getTransactionHistory(principal.getId(), PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // ── Webhooks ────────────────────────────────────────────────────────────

    @PostMapping("/webhook/razorpay")
    @Operation(summary = "Razorpay payment webhook callback")
    public ResponseEntity<String> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        
        log.info("Received Razorpay Webhook. Signature present: {}", signature != null);
        try {
            webhookService.handleRazorpayWebhook(payload, signature);
            return ResponseEntity.ok("OK");
        } catch (IllegalArgumentException ex) {
            log.warn("Invalid webhook request: {}", ex.getMessage());
            return ResponseEntity.badRequest().body("INVALID_WEBHOOK: " + ex.getMessage());
        } catch (Exception ex) {
            log.error("Internal error handling webhook", ex);
            return ResponseEntity.internalServerError().body("ERROR");
        }
    }
}
