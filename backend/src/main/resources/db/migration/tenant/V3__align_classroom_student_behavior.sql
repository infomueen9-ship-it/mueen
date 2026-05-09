CREATE TABLE IF NOT EXISTS student_behavior (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    statement TEXT NOT NULL,
    operation_type VARCHAR(10) NOT NULL,
    points INT NOT NULL,
    expected_score INT NOT NULL DEFAULT 80,
    evidence_type VARCHAR(20),
    evidence_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS student_behavior
ADD COLUMN IF NOT EXISTS expected_score INT NOT NULL DEFAULT 80;

ALTER TABLE IF EXISTS student_behavior
ADD COLUMN IF NOT EXISTS evidence_type VARCHAR(20);

ALTER TABLE IF EXISTS student_behavior
ADD COLUMN IF NOT EXISTS evidence_url TEXT;

ALTER TABLE IF EXISTS student_behavior
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS student_behavior
DROP CONSTRAINT IF EXISTS student_behavior_student_id_fkey;

CREATE INDEX IF NOT EXISTS idx_student_behavior_student_created_at
ON student_behavior(student_id, created_at DESC);
