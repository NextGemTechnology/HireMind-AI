package com.talentiq.infrastructure.payment;

import com.talentiq.model.SalaryDisbursement;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@Slf4j
public class MockPaymentProvider implements PaymentProvider {

    @Override
    public PaymentResult initiateDisbursement(SalaryDisbursement disbursement) {
        String txnRef = "MOCK-TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("MockPaymentProvider: Processed disbursement of {} {} for employee ID: {} [Ref: {}]",
                disbursement.getCurrency(), disbursement.getAmount(),
                disbursement.getEmployee().getId(), txnRef);
        return PaymentResult.builder()
                .transactionRef(txnRef)
                .status(PaymentStatus.SUCCESS)
                .timestamp(Instant.now())
                .build();
    }

    @Override
    public PaymentStatus checkStatus(String transactionRef) {
        return PaymentStatus.SUCCESS;
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }
}
