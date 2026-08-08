package com.mueen.modules.platform.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/admin/study-plans")
@CrossOrigin(origins = "*")
public class StudyPlansController {

    private final JdbcTemplate jdbcTemplate;

    // =========================================================
    // Initialization
    // =========================================================

    private void ensureTables() {

        // -------------------------
        // Terms
        // -------------------------
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS public.terms (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """);

        // -------------------------
        // Levels
        // -------------------------
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS public.level (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """);

        // -------------------------
        // Grades
        // -------------------------
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS public.grade (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                level_id BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                CONSTRAINT fk_grade_level
                    FOREIGN KEY (level_id)
                    REFERENCES public.level(id)
                    ON DELETE RESTRICT,

                CONSTRAINT uq_grade_level_name
                    UNIQUE (level_id, name)
            )
        """);

        // -------------------------
        // Subjects
        // -------------------------
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS public.subjects (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                level_id BIGINT NOT NULL,
                grade_id BIGINT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                CONSTRAINT fk_subject_level
                    FOREIGN KEY (level_id)
                    REFERENCES public.level(id)
                    ON DELETE RESTRICT,

                CONSTRAINT fk_subject_grade
                    FOREIGN KEY (grade_id)
                    REFERENCES public.grade(id)
                    ON DELETE RESTRICT,

                CONSTRAINT uq_subject_grade_name
                    UNIQUE (grade_id, name)
            )
        """);

        // -------------------------
        // Plan Bank
        // -------------------------
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS public.plan_bank (
                id BIGSERIAL PRIMARY KEY,

                term_id BIGINT NOT NULL,
                subject_id BIGINT NOT NULL,

                file_name VARCHAR(255) NOT NULL,
                file_data BYTEA NOT NULL,
                file_size INTEGER,

                created_by VARCHAR(100),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                CONSTRAINT fk_plan_term
                    FOREIGN KEY (term_id)
                    REFERENCES public.terms(id)
                    ON DELETE RESTRICT,

                CONSTRAINT fk_plan_subject
                    FOREIGN KEY (subject_id)
                    REFERENCES public.subjects(id)
                    ON DELETE RESTRICT
            )
        """);
    }

    // =========================================================
    // TERMS
    // =========================================================

    @GetMapping("/terms")
    public ResponseEntity<?> getTerms() {

        ensureTables();

        return ResponseEntity.ok(
            jdbcTemplate.queryForList("""
                SELECT id, name, created_at
                FROM public.terms
                ORDER BY id
            """)
        );
    }

    @PostMapping("/terms")
    @Transactional
    public ResponseEntity<?> createTerm(
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الفصل الدراسي مطلوب"));
        }

        try {

            Number id = jdbcTemplate.queryForObject("""
                INSERT INTO public.terms (name)
                VALUES (?)
                RETURNING id
            """, Number.class, name);

            return ResponseEntity.ok(
                    Map.of(
                            "id", id.longValue(),
                            "name", name,
                            "message", "تمت إضافة الفصل الدراسي"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الفصل الدراسي موجود مسبقًا"));
        }
    }

    @PutMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> updateTerm(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الفصل الدراسي مطلوب"));
        }

        int updated = jdbcTemplate.update("""
            UPDATE public.terms
            SET name = ?
            WHERE id = ?
        """, name, id);

        if (updated == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل الفصل الدراسي")
        );
    }

    @DeleteMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> deleteTerm(
            @PathVariable Long id
    ) {

        ensureTables();

        try {

            int deleted = jdbcTemplate.update("""
                DELETE FROM public.terms
                WHERE id = ?
            """, id);

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    Map.of("message", "تم حذف الفصل الدراسي")
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن حذف الفصل الدراسي لأنه مستخدم في خطط دراسية"
                    ));
        }
    }

    // =========================================================
    // LEVELS
    // =========================================================

    @GetMapping("/levels")
    public ResponseEntity<?> getLevels() {

        ensureTables();

        return ResponseEntity.ok(
            jdbcTemplate.queryForList("""
                SELECT id, name, created_at
                FROM public.level
                ORDER BY id
            """)
        );
    }

    @PostMapping("/levels")
    @Transactional
    public ResponseEntity<?> createLevel(
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المرحلة مطلوب"));
        }

        try {

            Number id = jdbcTemplate.queryForObject("""
                INSERT INTO public.level (name)
                VALUES (?)
                RETURNING id
            """, Number.class, name);

            return ResponseEntity.ok(
                    Map.of(
                            "id", id.longValue(),
                            "name", name,
                            "message", "تمت إضافة المرحلة"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة موجودة مسبقًا"));
        }
    }

    @PutMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> updateLevel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();

        if (name.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المرحلة مطلوب"));
        }

        int updated = jdbcTemplate.update("""
            UPDATE public.level
            SET name = ?
            WHERE id = ?
        """, name, id);

        if (updated == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل المرحلة")
        );
    }

    @DeleteMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> deleteLevel(
            @PathVariable Long id
    ) {

        ensureTables();

        try {

            int deleted = jdbcTemplate.update("""
                DELETE FROM public.level
                WHERE id = ?
            """, id);

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    Map.of("message", "تم حذف المرحلة")
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن حذف المرحلة لأنها مرتبطة بصفوف أو مواد"
                    ));
        }
    }

    // =========================================================
    // GRADES
    // =========================================================

    @GetMapping("/grades")
    public ResponseEntity<?> getGrades(
            @RequestParam(required = false) Long levelId
    ) {

        ensureTables();

        if (levelId != null) {

            return ResponseEntity.ok(
                jdbcTemplate.queryForList("""
                    SELECT
                        g.id,
                        g.name,
                        g.level_id,
                        l.name AS level_name
                    FROM public.grade g
                    JOIN public.level l
                        ON l.id = g.level_id
                    WHERE g.level_id = ?
                    ORDER BY g.id
                """, levelId)
            );
        }

        return ResponseEntity.ok(
            jdbcTemplate.queryForList("""
                SELECT
                    g.id,
                    g.name,
                    g.level_id,
                    l.name AS level_name
                FROM public.grade g
                JOIN public.level l
                    ON l.id = g.level_id
                ORDER BY g.level_id, g.id
            """)
        );
    }

    @PostMapping("/grades")
    @Transactional
    public ResponseEntity<?> createGrade(
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();
        Long levelId = toLong(body.get("levelId"));

        if (name.isEmpty() || levelId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الصف والمرحلة مطلوبان"));
        }

        if (!exists("public.level", levelId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة غير موجودة"));
        }

        try {

            Number id = jdbcTemplate.queryForObject("""
                INSERT INTO public.grade (name, level_id)
                VALUES (?, ?)
                RETURNING id
            """, Number.class, name, levelId);

            return ResponseEntity.ok(
                    Map.of(
                            "id", id.longValue(),
                            "name", name,
                            "levelId", levelId,
                            "message", "تمت إضافة الصف"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الصف موجود مسبقًا في هذه المرحلة"));
        }
    }

    @PutMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> updateGrade(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();
        Long levelId = toLong(body.get("levelId"));

        if (name.isEmpty() || levelId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الصف والمرحلة مطلوبان"));
        }

        int updated = jdbcTemplate.update("""
            UPDATE public.grade
            SET name = ?, level_id = ?
            WHERE id = ?
        """, name, levelId, id);

        if (updated == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل الصف")
        );
    }

    @DeleteMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> deleteGrade(
            @PathVariable Long id
    ) {

        ensureTables();

        try {

            int deleted = jdbcTemplate.update("""
                DELETE FROM public.grade
                WHERE id = ?
            """, id);

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    Map.of("message", "تم حذف الصف")
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن حذف الصف لأنه مرتبط بمواد"
                    ));
        }
    }

    // =========================================================
    // SUBJECTS
    // =========================================================

    @GetMapping("/subjects")
    public ResponseEntity<?> getSubjects(
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long gradeId
    ) {

        ensureTables();

        StringBuilder sql = new StringBuilder("""
            SELECT
                s.id,
                s.name,
                s.level_id,
                l.name AS level_name,
                s.grade_id,
                g.name AS grade_name
            FROM public.subjects s
            JOIN public.level l
                ON l.id = s.level_id
            JOIN public.grade g
                ON g.id = s.grade_id
            WHERE 1 = 1
        """);

        List<Object> params = new ArrayList<>();

        if (levelId != null) {
            sql.append(" AND s.level_id = ?");
            params.add(levelId);
        }

        if (gradeId != null) {
            sql.append(" AND s.grade_id = ?");
            params.add(gradeId);
        }

        sql.append(" ORDER BY s.level_id, s.grade_id, s.id");

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(sql.toString(), params.toArray())
        );
    }

    @PostMapping("/subjects")
    @Transactional
    public ResponseEntity<?> createSubject(
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();
        Long levelId = toLong(body.get("levelId"));
        Long gradeId = toLong(body.get("gradeId"));

        if (name.isEmpty() || levelId == null || gradeId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "اسم المادة والمرحلة والصف مطلوبة"
                    ));
        }

        // التأكد أن الصف تابع للمرحلة
        Integer count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM public.grade
            WHERE id = ? AND level_id = ?
        """, Integer.class, gradeId, levelId);

        if (count == null || count == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "الصف المحدد لا يتبع المرحلة المحددة"
                    ));
        }

        try {

            Number id = jdbcTemplate.queryForObject("""
                INSERT INTO public.subjects
                    (name, level_id, grade_id)
                VALUES (?, ?, ?)
                RETURNING id
            """, Number.class, name, levelId, gradeId);

            return ResponseEntity.ok(
                    Map.of(
                            "id", id.longValue(),
                            "name", name,
                            "levelId", levelId,
                            "gradeId", gradeId,
                            "message", "تمت إضافة المادة"
                    )
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "المادة موجودة مسبقًا لهذا الصف"
                    ));
        }
    }

    @PutMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> updateSubject(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureTables();

        String name = Objects.toString(body.get("name"), "").trim();
        Long levelId = toLong(body.get("levelId"));
        Long gradeId = toLong(body.get("gradeId"));

        if (name.isEmpty() || levelId == null || gradeId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "اسم المادة والمرحلة والصف مطلوبة"
                    ));
        }

        Integer count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM public.grade
            WHERE id = ? AND level_id = ?
        """, Integer.class, gradeId, levelId);

        if (count == null || count == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "الصف المحدد لا يتبع المرحلة المحددة"
                    ));
        }

        try {

            int updated = jdbcTemplate.update("""
                UPDATE public.subjects
                SET
                    name = ?,
                    level_id = ?,
                    grade_id = ?
                WHERE id = ?
            """, name, levelId, gradeId, id);

            if (updated == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    Map.of("message", "تم تعديل المادة")
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن تعديل المادة بهذه البيانات"
                    ));
        }
    }

    @DeleteMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> deleteSubject(
            @PathVariable Long id
    ) {

        ensureTables();

        try {

            int deleted = jdbcTemplate.update("""
                DELETE FROM public.subjects
                WHERE id = ?
            """, id);

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(
                    Map.of("message", "تم حذف المادة")
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن حذف المادة لأنها مرتبطة بخطط دراسية"
                    ));
        }
    }

    // =========================================================
    // PLANS
    // =========================================================

    @GetMapping("/plans")
    public ResponseEntity<?> getPlans(
            @RequestParam(required = false) Long termId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long gradeId,
            @RequestParam(required = false) Long subjectId
    ) {

        ensureTables();

        StringBuilder sql = new StringBuilder("""
            SELECT
                p.id,
                p.term_id,
                t.name AS term_name,

                p.subject_id,
                s.name AS subject_name,

                s.level_id,
                l.name AS level_name,

                s.grade_id,
                g.name AS grade_name,

                p.file_name,
                p.file_size,
                p.created_by,
                p.created_at

            FROM public.plan_bank p

            JOIN public.terms t
                ON t.id = p.term_id

            JOIN public.subjects s
                ON s.id = p.subject_id

            JOIN public.level l
                ON l.id = s.level_id

            JOIN public.grade g
                ON g.id = s.grade_id

            WHERE 1 = 1
        """);

        List<Object> params = new ArrayList<>();

        if (termId != null) {
            sql.append(" AND p.term_id = ?");
            params.add(termId);
        }

        if (levelId != null) {
            sql.append(" AND s.level_id = ?");
            params.add(levelId);
        }

        if (gradeId != null) {
            sql.append(" AND s.grade_id = ?");
            params.add(gradeId);
        }

        if (subjectId != null) {
            sql.append(" AND p.subject_id = ?");
            params.add(subjectId);
        }

        sql.append(" ORDER BY p.created_at DESC");

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(
                        sql.toString(),
                        params.toArray()
                )
        );
    }

    @PostMapping(
            value = "/plans/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ResponseEntity<?> uploadPlan(
            @RequestParam Long termId,
            @RequestParam Long subjectId,
            @RequestParam String createdBy,
            @RequestParam MultipartFile file
    ) throws IOException {

        ensureTables();

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "يرجى اختيار ملف"));
        }

        if (!exists("public.terms", termId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الفصل الدراسي غير موجود"));
        }

        if (!exists("public.subjects", subjectId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المادة غير موجودة"));
        }

        String fileName = file.getOriginalFilename();

        if (fileName == null || fileName.isBlank()) {
            fileName = "study-plan";
        }

        jdbcTemplate.update("""
            INSERT INTO public.plan_bank
                (
                    term_id,
                    subject_id,
                    file_name,
                    file_data,
                    file_size,
                    created_by
                )
            VALUES (?, ?, ?, ?, ?, ?)
        """,
                termId,
                subjectId,
                fileName,
                file.getBytes(),
                (int) file.getSize(),
                createdBy
        );

        return ResponseEntity.ok(
                Map.of("message", "تم رفع الخطة بنجاح")
        );
    }

    // =========================================================
    // DOWNLOAD PLAN
    // =========================================================

    @GetMapping("/plans/{id}/download")
    public ResponseEntity<byte[]> downloadPlan(
            @PathVariable Long id
    ) {

        ensureTables();

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList("""
                    SELECT file_name, file_data
                    FROM public.plan_bank
                    WHERE id = ?
                """, id);

        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String fileName =
                Objects.toString(
                        rows.get(0).get("file_name"),
                        "study-plan"
                );

        byte[] fileData =
                (byte[]) rows.get(0).get("file_data");

        return ResponseEntity.ok()
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" +
                                fileName +
                                "\""
                )
                .contentType(
                        MediaType.APPLICATION_OCTET_STREAM
                )
                .body(fileData);
    }

    // =========================================================
    // DELETE PLAN
    // =========================================================

    @DeleteMapping("/plans/{id}")
    @Transactional
    public ResponseEntity<?> deletePlan(
            @PathVariable Long id
    ) {

        ensureTables();

        int deleted = jdbcTemplate.update("""
            DELETE FROM public.plan_bank
            WHERE id = ?
        """, id);

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف الخطة")
        );
    }

    // =========================================================
    // Helpers
    // =========================================================

    private boolean exists(
            String table,
            Long id
    ) {

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE id = ?",
                Integer.class,
                id
        );

        return count != null && count > 0;
    }

    private Long toLong(Object value) {

        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(value.toString());
        } catch (Exception e) {
            return null;
        }
    }
}