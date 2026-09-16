package com.talentiq.model;

import com.talentiq.common.audit.AuditEntity;
import com.talentiq.model.Company;
import com.talentiq.model.User;
import com.talentiq.model.auth.HrCredential;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Data
@EqualsAndHashCode(callSuper = false)
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "hr_profiles",
        indexes = {
                @Index(name = "idx_hr_profiles_email", columnList = "email"),
                @Index(name = "idx_hr_profiles_company_id", columnList = "company_id"),
                @Index(name = "idx_hr_profiles_is_company_admin", columnList = "is_company_admin")
        }
)
@Builder
public class HrProfile extends AuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

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
    private Instant companyVerifiedAt;

    @Column(name = "company_verified_title", length = 150)
    private String companyVerifiedTitle;

    @OneToOne(mappedBy = "hrProfile", fetch = FetchType.LAZY)
    private HrCredential hrCredential;

    public String getFullName() {
        String first = firstName != null ? firstName.trim() : (user != null ? user.getFirstName() : "");
        String last = lastName != null ? lastName.trim() : (user != null ? user.getLastName() : "");
        return (first + " " + last).trim();
    }
}
