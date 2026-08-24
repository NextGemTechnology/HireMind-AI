package com.talentiq.model;
import lombok.*;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.model.Company;
import com.talentiq.model.User;
import jakarta.persistence.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "hr_profiles",
        indexes = {
                @Index(name = "idx_hr_profiles_company_id", columnList = "company_id"),
                @Index(name = "idx_hr_profiles_is_company_admin", columnList = "is_company_admin")
        }
)
@Builder
public class HrProfile extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(length = 150)
    private String designation;

    @Column(length = 100)
    private String department;

    @Column(name = "is_company_admin", nullable = false)
    @Builder.Default
    private boolean companyAdmin = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "is_company_verified", nullable = false)
    @Builder.Default
    private boolean companyVerified = false;

    @Column(name = "company_verified_at")
    private java.time.Instant companyVerifiedAt;

    @Column(name = "company_verified_title", length = 150)
    private String companyVerifiedTitle;
}
