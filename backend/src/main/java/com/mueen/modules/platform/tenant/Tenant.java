package com.mueen.modules.platform.tenant;

import com.mueen.shared.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "tenants", schema = "public")
public class Tenant extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "schema_name", nullable = false, unique = true)
    private String schemaName;

    @Column(name = "school_name", nullable = false)
    private String schoolName;

    @Column(name = "school_name_ar", nullable = false)
    private String schoolNameAr;

    @Column(name = "commercial_reg")
    private String commercialReg;

    @Column(name = "ministry_code")
    private String ministryCode;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "phone", nullable = false)
    private String phone;

    @Column(name = "city")
    private String city;

    @Column(name = "address")
    private String address;

    @Column(name = "logo_url")
    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender_type", nullable = false)
    private GenderType genderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TenantStatus status;

    @Column(name = "trial_ends_at")
    private java.time.Instant trialEndsAt;

    public enum GenderType {
        BOYS, GIRLS, MIXED
    }

    public enum TenantStatus {
        ACTIVE, SUSPENDED, TRIAL, CANCELLED
    }
}
