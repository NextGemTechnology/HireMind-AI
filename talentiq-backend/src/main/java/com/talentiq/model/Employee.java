package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.common.enums.EmployeeStatus;
import com.talentiq.common.enums.EmploymentType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "employees",
        indexes = {
                @Index(name = "idx_emp_company_status", columnList = "company_id, status"),
                @Index(name = "idx_emp_user", columnList = "user_id"),
                @Index(name = "idx_emp_hr", columnList = "hr_profile_id"),
                @Index(name = "idx_emp_verification", columnList = "verification_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_emp_company_user", columnNames = {"company_id", "user_id"}),
                @UniqueConstraint(name = "uk_emp_code", columnNames = {"employee_code"})
        }
)
@Builder
public class Employee extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hr_profile_id")
    private HrProfile hrProfile;

    @Column(name = "employee_code", length = 50)
    private String employeeCode;

    @Column(name = "job_title", nullable = false, length = 200)
    private String jobTitle;

    @Column(name = "department", length = 100)
    private String department;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 30)
    @Builder.Default
    private EmploymentType employmentType = EmploymentType.FULL_TIME;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.PENDING_VERIFICATION;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "termination_status", length = 30)
    private String terminationStatus;

    @Column(name = "termination_reason", length = 500)
    private String terminationReason;

    @Column(name = "notice_period_days")
    private Integer noticePeriodDays;

    @Column(name = "last_working_date")
    private LocalDate lastWorkingDate;

    @Column(name = "terminated_at")
    private Instant terminatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "terminated_by")
    private User terminatedBy;

    @Column(name = "base_salary", precision = 12, scale = 2)
    private BigDecimal baseSalary;

    @Column(name = "salary_currency", length = 10)
    @Builder.Default
    private String salaryCurrency = "INR";

    @Column(name = "salary_period", length = 20)
    @Builder.Default
    private String salaryPeriod = "MONTHLY";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verification_id")
    private CompanyCandidateVerification verification;
}
