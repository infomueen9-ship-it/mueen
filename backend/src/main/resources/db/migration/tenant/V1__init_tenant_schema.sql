-- ============================================================
-- منصة معين — Tenant Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS school_settings (
    id                  BIGSERIAL PRIMARY KEY,
    school_name         VARCHAR(255) NOT NULL,
    school_name_ar      VARCHAR(255) NOT NULL,
    ministry_code       VARCHAR(50),
    commercial_reg      VARCHAR(50),
    vat_number          VARCHAR(20),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    address             TEXT,
    city                VARCHAR(100),
    logo_url            TEXT,
    gender_type         VARCHAR(10)  NOT NULL CHECK (gender_type IN ('BOYS','GIRLS','MIXED')),
    school_type         VARCHAR(20)  NOT NULL DEFAULT 'PRIVATE' CHECK (school_type IN ('PRIVATE','GOVERNMENT','INTERNATIONAL')),
    hijri_calendar      BOOLEAN      NOT NULL DEFAULT TRUE,
    whatsapp_enabled    BOOLEAN      NOT NULL DEFAULT FALSE,
    sms_enabled         BOOLEAN      NOT NULL DEFAULT FALSE,
    passing_grade       NUMERIC(5,2) NOT NULL DEFAULT 50,
    max_grade           NUMERIC(5,2) NOT NULL DEFAULT 100,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_years (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL,
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,
    is_current      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_year
    ON academic_years(is_current) WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS semesters (
    id               BIGSERIAL PRIMARY KEY,
    academic_year_id BIGINT      NOT NULL REFERENCES academic_years(id),
    name             VARCHAR(50) NOT NULL,
    semester_number  SMALLINT    NOT NULL CHECK (semester_number IN (1,2,3)),
    start_date       DATE        NOT NULL,
    end_date         DATE        NOT NULL,
    is_current       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, semester_number)
);

CREATE TABLE IF NOT EXISTS grade_levels (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,
    name_en     VARCHAR(50),
    stage       VARCHAR(20) NOT NULL CHECK (stage IN ('ELEMENTARY','MIDDLE','HIGH')),
    grade_order SMALLINT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (grade_order)
);

CREATE TABLE IF NOT EXISTS classrooms (
    id                  BIGSERIAL PRIMARY KEY,
    academic_year_id    BIGINT      NOT NULL REFERENCES academic_years(id),
    grade_level_id      BIGINT      NOT NULL REFERENCES grade_levels(id),
    name                VARCHAR(20) NOT NULL,
    capacity            SMALLINT    NOT NULL DEFAULT 30,
    homeroom_teacher_id BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, grade_level_id, name)
);

CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    full_name_en    VARCHAR(255),
    national_id     VARCHAR(20)  UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('PRINCIPAL','TEACHER','ADMIN')),
    gender          VARCHAR(6)   NOT NULL CHECK (gender IN ('MALE','FEMALE')),
    avatar_url      TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    specialization  VARCHAR(100),
    qualification   VARCHAR(100),
    hire_date       DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE classrooms
    ADD CONSTRAINT fk_homeroom_teacher
    FOREIGN KEY (homeroom_teacher_id) REFERENCES users(id);

CREATE TABLE IF NOT EXISTS students (
    id                BIGSERIAL PRIMARY KEY,
    student_number    VARCHAR(30)  NOT NULL UNIQUE,
    national_id       VARCHAR(20)  UNIQUE,
    full_name         VARCHAR(255) NOT NULL,
    full_name_en      VARCHAR(255),
    gender            VARCHAR(6)   NOT NULL CHECK (gender IN ('MALE','FEMALE')),
    birth_date        DATE         NOT NULL,
    birth_date_hijri  VARCHAR(20),
    nationality       VARCHAR(50)  NOT NULL DEFAULT 'سعودي',
    religion          VARCHAR(20)  DEFAULT 'مسلم',
    blood_type        VARCHAR(5),
    photo_url         TEXT,
    enrollment_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
    enrollment_status VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                          CHECK (enrollment_status IN ('ACTIVE','INACTIVE','GRADUATED','TRANSFERRED','SUSPENDED')),
    medical_notes     TEXT,
    address           TEXT,
    city              VARCHAR(100),
    noor_id           VARCHAR(50)  UNIQUE,
    expected_score    INT          NOT NULL DEFAULT 80,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id               BIGSERIAL PRIMARY KEY,
    student_id       BIGINT      NOT NULL REFERENCES students(id),
    classroom_id     BIGINT      NOT NULL REFERENCES classrooms(id),
    academic_year_id BIGINT      NOT NULL REFERENCES academic_years(id),
    enrollment_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    status           VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','TRANSFERRED','WITHDRAWN')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS guardians (
    id               BIGSERIAL PRIMARY KEY,
    full_name        VARCHAR(255) NOT NULL,
    national_id      VARCHAR(20),
    relationship     VARCHAR(30)  NOT NULL CHECK (relationship IN ('FATHER','MOTHER','GUARDIAN','BROTHER','SISTER','OTHER')),
    phone            VARCHAR(20)  NOT NULL,
    phone_whatsapp   VARCHAR(20),
    email            VARCHAR(255),
    occupation       VARCHAR(100),
    national_id_url  TEXT,
    is_primary       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_guardians (
    id                 BIGSERIAL PRIMARY KEY,
    student_id         BIGINT      NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id        BIGINT      NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    is_primary_contact BOOLEAN     NOT NULL DEFAULT FALSE,
    can_pickup         BOOLEAN     NOT NULL DEFAULT TRUE,
    receive_sms        BOOLEAN     NOT NULL DEFAULT TRUE,
    receive_whatsapp   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    name_en        VARCHAR(100),
    code           VARCHAR(20)  NOT NULL UNIQUE,
    grade_level_id BIGINT       NOT NULL REFERENCES grade_levels(id),
    weekly_hours   SMALLINT     NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_subjects (
    id               BIGSERIAL PRIMARY KEY,
    teacher_id       BIGINT      NOT NULL REFERENCES users(id),
    subject_id       BIGINT      NOT NULL REFERENCES subjects(id),
    classroom_id     BIGINT      NOT NULL REFERENCES classrooms(id),
    academic_year_id BIGINT      NOT NULL REFERENCES academic_years(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_id, subject_id, classroom_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id               BIGSERIAL PRIMARY KEY,
    student_id       BIGINT      NOT NULL REFERENCES students(id),
    classroom_id     BIGINT      NOT NULL REFERENCES classrooms(id),
    academic_year_id BIGINT      NOT NULL REFERENCES academic_years(id),
    date             DATE        NOT NULL,
    status           VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT','ABSENT','LATE','EXCUSED')),
    late_minutes     SMALLINT,
    notes            TEXT,
    recorded_by      BIGINT      NOT NULL REFERENCES users(id),
    notified_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS exam_types (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(50)  NOT NULL,
    weight_percent NUMERIC(5,2) NOT NULL,
    semester_id    BIGINT       NOT NULL REFERENCES semesters(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grades (
    id           BIGSERIAL PRIMARY KEY,
    student_id   BIGINT       NOT NULL REFERENCES students(id),
    subject_id   BIGINT       NOT NULL REFERENCES subjects(id),
    semester_id  BIGINT       NOT NULL REFERENCES semesters(id),
    exam_type_id BIGINT       NOT NULL REFERENCES exam_types(id),
    score        NUMERIC(6,2) NOT NULL,
    max_score    NUMERIC(6,2) NOT NULL DEFAULT 100,
    notes        TEXT,
    entered_by   BIGINT       NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, semester_id, exam_type_id)
);

CREATE TABLE IF NOT EXISTS fee_structures (
    id               BIGSERIAL PRIMARY KEY,
    academic_year_id BIGINT        NOT NULL REFERENCES academic_years(id),
    grade_level_id   BIGINT        NOT NULL REFERENCES grade_levels(id),
    name             VARCHAR(100)  NOT NULL,
    fee_type         VARCHAR(30)   NOT NULL CHECK (fee_type IN ('TUITION','ACTIVITY','TRANSPORT','UNIFORM','OTHER')),
    total_amount     NUMERIC(10,2) NOT NULL,
    vat_included     BOOLEAN       NOT NULL DEFAULT TRUE,
    installments     SMALLINT      NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (academic_year_id, grade_level_id, fee_type)
);

CREATE TABLE IF NOT EXISTS student_fees (
    id               BIGSERIAL PRIMARY KEY,
    student_id       BIGINT        NOT NULL REFERENCES students(id),
    fee_structure_id BIGINT        NOT NULL REFERENCES fee_structures(id),
    academic_year_id BIGINT        NOT NULL REFERENCES academic_years(id),
    total_amount     NUMERIC(10,2) NOT NULL,
    discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_reason  TEXT,
    net_amount       NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - discount_amount) STORED,
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','PARTIAL','PAID','OVERDUE','WAIVED')),
    due_date         DATE          NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id               BIGSERIAL PRIMARY KEY,
    student_fee_id   BIGINT        NOT NULL REFERENCES student_fees(id),
    student_id       BIGINT        NOT NULL REFERENCES students(id),
    amount           NUMERIC(10,2) NOT NULL,
    vat_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method   VARCHAR(30)   NOT NULL CHECK (payment_method IN ('CASH','MADA','VISA','STC_PAY','BANK_TRANSFER','OTHER')),
    payment_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    zatca_invoice_id VARCHAR(100),
    zatca_qr_code    TEXT,
    notes            TEXT,
    received_by      BIGINT        NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications_log (
    id          BIGSERIAL PRIMARY KEY,
    student_id  BIGINT      REFERENCES students(id),
    guardian_id BIGINT      REFERENCES guardians(id),
    channel     VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP','SMS','EMAIL','PUSH')),
    type        VARCHAR(50) NOT NULL,
    message     TEXT        NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','DELIVERED','FAILED','PENDING')),
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: grade_levels
INSERT INTO grade_levels (name, name_en, stage, grade_order) VALUES
    ('الصف الأول الابتدائي',   'Grade 1',  'ELEMENTARY', 1),
    ('الصف الثاني الابتدائي',  'Grade 2',  'ELEMENTARY', 2),
    ('الصف الثالث الابتدائي',  'Grade 3',  'ELEMENTARY', 3),
    ('الصف الرابع الابتدائي',  'Grade 4',  'ELEMENTARY', 4),
    ('الصف الخامس الابتدائي',  'Grade 5',  'ELEMENTARY', 5),
    ('الصف السادس الابتدائي',  'Grade 6',  'ELEMENTARY', 6),
    ('الصف الأول المتوسط',     'Grade 7',  'MIDDLE',     7),
    ('الصف الثاني المتوسط',    'Grade 8',  'MIDDLE',     8),
    ('الصف الثالث المتوسط',    'Grade 9',  'MIDDLE',     9),
    ('الصف الأول الثانوي',     'Grade 10', 'HIGH',       10),
    ('الصف الثاني الثانوي',    'Grade 11', 'HIGH',       11),
    ('الصف الثالث الثانوي',    'Grade 12', 'HIGH',       12)
ON CONFLICT DO NOTHING;