package com.mueen.modules.platform.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public Tenant createTenant(CreateTenantRequest request) {

        if (tenantRepository.existsByEmail(request.email())) {
            throw new RuntimeException("Email already exists");
        }

        String schemaName = "school_" + request.schoolCode().toLowerCase()
                .replaceAll("[^a-z0-9]", "_");

        if (tenantRepository.existsBySchemaName(schemaName)) {
            throw new RuntimeException("School code already exists");
        }

        // 1. إنشاء الـ schema
        jdbcTemplate.execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

        // 2. تطبيق الجداول مباشرة
        applyTenantMigrations(schemaName);

        // 3. حفظ المدرسة
        Tenant tenant = Tenant.builder()
                .schemaName(schemaName)
                .schoolName(request.schoolName())
                .schoolNameAr(request.schoolNameAr())
                .email(request.email())
                .phone(request.phone())
                .city(request.city())
                .genderType(Tenant.GenderType.valueOf(request.genderType()))
                .status(Tenant.TenantStatus.TRIAL)
                .trialEndsAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        return tenantRepository.save(tenant);
    }

    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    public Tenant getTenantById(Long id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
    }

    private void applyTenantMigrations(String schema) {
        String p = schema + ".";
        jdbcTemplate.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA " + schema + " TO mueen_user");
jdbcTemplate.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA " + schema + " GRANT ALL ON TABLES TO mueen_user");
jdbcTemplate.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA " + schema + " TO mueen_user");
        
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "users (id BIGSERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, national_id VARCHAR(20) UNIQUE, username VARCHAR(50) NOT NULL UNIQUE, email VARCHAR(255) UNIQUE, phone VARCHAR(20), password_hash TEXT NOT NULL, role VARCHAR(20) NOT NULL, gender VARCHAR(6) NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, last_login_at TIMESTAMPTZ, hire_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "school_settings (id BIGSERIAL PRIMARY KEY, school_name VARCHAR(255) NOT NULL, school_name_ar VARCHAR(255) NOT NULL, gender_type VARCHAR(10) NOT NULL, school_type VARCHAR(20) NOT NULL DEFAULT 'PRIVATE', hijri_calendar BOOLEAN NOT NULL DEFAULT TRUE, whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE, sms_enabled BOOLEAN NOT NULL DEFAULT FALSE, passing_grade NUMERIC(5,2) NOT NULL DEFAULT 50, max_grade NUMERIC(5,2) NOT NULL DEFAULT 100, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "academic_years (id BIGSERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, is_current BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "semesters (id BIGSERIAL PRIMARY KEY, academic_year_id BIGINT NOT NULL REFERENCES " + p + "academic_years(id), name VARCHAR(50) NOT NULL, semester_number SMALLINT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, is_current BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "grade_levels (id BIGSERIAL PRIMARY KEY, name VARCHAR(50) NOT NULL, name_en VARCHAR(50), stage VARCHAR(20) NOT NULL, grade_order SMALLINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        
jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "teachers (id BIGSERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, username VARCHAR(50) NOT NULL UNIQUE, password_hash TEXT NOT NULL, phone VARCHAR(20), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");        
jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "classrooms (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL)");
   
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "classroom_subjects (id BIGSERIAL PRIMARY KEY, classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(classroom_id, name))");

jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "classroom_schedule (id BIGSERIAL PRIMARY KEY, classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id) ON DELETE CASCADE, period VARCHAR(50) NOT NULL, day VARCHAR(20) NOT NULL, subject_name VARCHAR(100), UNIQUE(classroom_id, period, day))");     
jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "classroom_students (id BIGSERIAL PRIMARY KEY, classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id) ON DELETE CASCADE, full_name VARCHAR(255) NOT NULL, guardian_phone VARCHAR(20), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "students (" +
                "id BIGSERIAL PRIMARY KEY, student_number VARCHAR(30) NOT NULL UNIQUE, national_id VARCHAR(20) UNIQUE, full_name VARCHAR(255) NOT NULL, gender VARCHAR(6) NOT NULL, birth_date DATE NOT NULL, nationality VARCHAR(50) NOT NULL DEFAULT 'سعودي', enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE, enrollment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', noor_id VARCHAR(50) UNIQUE, behavior_score INT NOT NULL DEFAULT 80, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");


        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "guardians (id BIGSERIAL PRIMARY KEY, full_name VARCHAR(255) NOT NULL, national_id VARCHAR(20), relationship VARCHAR(30) NOT NULL, phone VARCHAR(20) NOT NULL, phone_whatsapp VARCHAR(20), email VARCHAR(255), is_primary BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "student_guardians (id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES " + p + "students(id) ON DELETE CASCADE, guardian_id BIGINT NOT NULL REFERENCES " + p + "guardians(id) ON DELETE CASCADE, is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE, can_pickup BOOLEAN NOT NULL DEFAULT TRUE, receive_sms BOOLEAN NOT NULL DEFAULT TRUE, receive_whatsapp BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "student_enrollments (id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES " + p + "students(id), classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id), enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "student_behavior (id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES " + p + "students(id) ON DELETE CASCADE, statement TEXT NOT NULL, operation_type VARCHAR(10) NOT NULL, points INT NOT NULL, expected_score INT NOT NULL, evidence_type VARCHAR(20), evidence_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "subjects (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, name_en VARCHAR(100), code VARCHAR(20) NOT NULL UNIQUE, grade_level_id BIGINT NOT NULL REFERENCES " + p + "grade_levels(id), weekly_hours SMALLINT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "attendance (id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES " + p + "students(id), classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id), academic_year_id BIGINT NOT NULL REFERENCES " + p + "academic_years(id), date DATE NOT NULL, status VARCHAR(20) NOT NULL, notes TEXT, recorded_by BIGINT NOT NULL REFERENCES " + p + "users(id), notified_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "fee_structures (id BIGSERIAL PRIMARY KEY, academic_year_id BIGINT NOT NULL REFERENCES " + p + "academic_years(id), grade_level_id BIGINT NOT NULL REFERENCES " + p + "grade_levels(id), name VARCHAR(100) NOT NULL, fee_type VARCHAR(30) NOT NULL, total_amount NUMERIC(10,2) NOT NULL, vat_included BOOLEAN NOT NULL DEFAULT TRUE, installments SMALLINT NOT NULL DEFAULT 1, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "student_fees (id BIGSERIAL PRIMARY KEY, student_id BIGINT NOT NULL REFERENCES " + p + "students(id), fee_structure_id BIGINT NOT NULL REFERENCES " + p + "fee_structures(id), academic_year_id BIGINT NOT NULL REFERENCES " + p + "academic_years(id), total_amount NUMERIC(10,2) NOT NULL, discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0, discount_reason TEXT, net_amount NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED, status VARCHAR(20) NOT NULL DEFAULT 'PENDING', due_date DATE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "payments (id BIGSERIAL PRIMARY KEY, student_fee_id BIGINT NOT NULL REFERENCES " + p + "student_fees(id), student_id BIGINT NOT NULL REFERENCES " + p + "students(id), amount NUMERIC(10,2) NOT NULL, vat_amount NUMERIC(10,2) NOT NULL DEFAULT 0, payment_method VARCHAR(30) NOT NULL, payment_date DATE NOT NULL DEFAULT CURRENT_DATE, reference_number VARCHAR(100), notes TEXT, received_by BIGINT NOT NULL REFERENCES " + p + "users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "notifications_log (id BIGSERIAL PRIMARY KEY, student_id BIGINT REFERENCES " + p + "students(id), guardian_id BIGINT REFERENCES " + p + "guardians(id), channel VARCHAR(20) NOT NULL, type VARCHAR(50) NOT NULL, message TEXT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'SENT', sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        // جداول الانتظار والمناوبة
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "substitute_schedules (id BIGSERIAL PRIMARY KEY, executor_type VARCHAR(10) NOT NULL, teacher_id BIGINT REFERENCES " + p + "teachers(id), admin_name VARCHAR(255), admin_phone VARCHAR(20), classroom_id BIGINT NOT NULL REFERENCES " + p + "classrooms(id) ON DELETE CASCADE, scheduled_date DATE NOT NULL, period VARCHAR(20) NOT NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + p + "duty_schedules (id BIGSERIAL PRIMARY KEY, executor_type VARCHAR(10) NOT NULL, teacher_id BIGINT REFERENCES " + p + "teachers(id), admin_name VARCHAR(255), admin_phone VARCHAR(20), location VARCHAR(255) NOT NULL, scheduled_date DATE NOT NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

        jdbcTemplate.execute("INSERT INTO " + p + "grade_levels (name, name_en, stage, grade_order) VALUES ('الصف الأول الابتدائي','Grade 1','ELEMENTARY',1),('الصف الثاني الابتدائي','Grade 2','ELEMENTARY',2),('الصف الثالث الابتدائي','Grade 3','ELEMENTARY',3),('الصف الرابع الابتدائي','Grade 4','ELEMENTARY',4),('الصف الخامس الابتدائي','Grade 5','ELEMENTARY',5),('الصف السادس الابتدائي','Grade 6','ELEMENTARY',6),('الصف الأول المتوسط','Grade 7','MIDDLE',7),('الصف الثاني المتوسط','Grade 8','MIDDLE',8),('الصف الثالث المتوسط','Grade 9','MIDDLE',9),('الصف الأول الثانوي','Grade 10','HIGH',10),('الصف الثاني الثانوي','Grade 11','HIGH',11),('الصف الثالث الثانوي','Grade 12','HIGH',12) ON CONFLICT DO NOTHING");
    // منح الصلاحيات لـ mueen_user
jdbcTemplate.execute("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA " + schema + " TO mueen_user");
jdbcTemplate.execute("ALTER DEFAULT PRIVILEGES IN SCHEMA " + schema + " GRANT ALL ON TABLES TO mueen_user");
jdbcTemplate.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA " + schema + " TO mueen_user");
    }

    public record CreateTenantRequest(
            String schoolName,
            String schoolNameAr,
            String schoolCode,
            String email,
            String phone,
            String city,
            String genderType
    ) {}
}