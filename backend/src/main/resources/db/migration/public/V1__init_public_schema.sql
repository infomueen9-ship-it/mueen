-- ============================================================
-- منصة معين — Public Schema
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    name_ar       VARCHAR(100) NOT NULL,
    max_students  INT          NOT NULL,
    max_users     INT          NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL,
    price_yearly  NUMERIC(10,2) NOT NULL,
    features      JSONB        DEFAULT '{}',
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
    id              BIGSERIAL PRIMARY KEY,
    schema_name     VARCHAR(63)  NOT NULL UNIQUE,
    school_name     VARCHAR(255) NOT NULL,
    school_name_ar  VARCHAR(255) NOT NULL,
    commercial_reg  VARCHAR(50),
    ministry_code   VARCHAR(50),
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20)  NOT NULL,
    city            VARCHAR(100),
    address         TEXT,
    logo_url        TEXT,
    gender_type     VARCHAR(10)  NOT NULL CHECK (gender_type IN ('BOYS','GIRLS','MIXED')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'TRIAL'
                        CHECK (status IN ('ACTIVE','SUSPENDED','TRIAL','CANCELLED')),
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       BIGINT       NOT NULL REFERENCES tenants(id),
    plan_id         BIGINT       NOT NULL REFERENCES subscription_plans(id),
    billing_cycle   VARCHAR(10)  NOT NULL CHECK (billing_cycle IN ('MONTHLY','YEARLY')),
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ  NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_admins (
    id              BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    role            VARCHAR(30)  NOT NULL DEFAULT 'ADMIN'
                        CHECK (role IN ('SUPER_ADMIN','ADMIN','SUPPORT')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_status  ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_schema  ON tenants(schema_name);

-- Seed: Default Plans
INSERT INTO subscription_plans (name, name_ar, max_students, max_users, price_monthly, price_yearly)
VALUES
    ('Starter',   'أساسية',  300,  10,  299,  2990),
    ('Growth',    'متقدمة',  800,  30,  599,  5990),
    ('Enterprise','مؤسسية', 9999, 999, 1199, 11990)
ON CONFLICT DO NOTHING;