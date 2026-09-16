package com.talentiq.infrastructure.payment;

import com.talentiq.model.SalaryDisbursement;

public interface PaymentProvider {
    PaymentResult initiateDisbursement(SalaryDisbursement disbursement);
    PaymentStatus checkStatus(String transactionRef);
    String getProviderName();
}
