package com.mueen.modules.platform.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/admin/study-plans")
@CrossOrigin(origins = "*")
public class StudyPlansController {

    private final JdbcTemplate jdbcTemplate;

    // =========================================================
    // TERMS
    // =========================================================

    @GetMapping("/terms")
    public ResponseEntity<List<Map<String, Object>>> getTerms() {
        return ResponseEntity.ok(jdbcTemplate.queryForList(
                "SELECT id, name FROM public.terms ORDER BY id"
        ));
    }

    @PostMapping("/terms")
    @Transactional
    public ResponseEntity<?> createTerm(@RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        if (blank(name)) return bad("اسم الفصل الدراسي مطلوب");

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.terms WHERE name = ?",
                Integer.class, name.trim());
        if (exists != null && exists > 0) return bad("الفصل الدراسي موجود مسبقًا");

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.terms(name) VALUES (?) RETURNING id",
                Long.class, name.trim());
        return ResponseEntity.ok(Map.of("message", "تمت إضافة الفصل الدراسي بنجاح", "id", id));
    }

    @PutMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> updateTerm(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        if (blank(name)) return bad("اسم الفصل الدراسي مطلوب");
        if (!exists("public.terms", id)) return ResponseEntity.notFound().build();

        Integer duplicate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.terms WHERE name = ? AND id <> ?",
                Integer.class, name.trim(), id);
        if (duplicate != null && duplicate > 0) return bad("الفصل الدراسي موجود مسبقًا");

        jdbcTemplate.update("UPDATE public.terms SET name = ? WHERE id = ?", name.trim(), id);
        return ok("تم تعديل الفصل الدراسي بنجاح");
    }

    @DeleteMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> deleteTerm(@PathVariable Long id) {
        int deleted = jdbcTemplate.update("DELETE FROM public.terms WHERE id = ?", id);
        return deleted == 0 ? ResponseEntity.notFound().build() : ok("تم حذف الفصل الدراسي بنجاح");
    }

    // =========================================================
    // LEVELS
    // =========================================================

    @GetMapping("/levels")
    public ResponseEntity<List<Map<String, Object>>> getLevels() {
        return ResponseEntity.ok(jdbcTemplate.queryForList(
                "SELECT id, name FROM public.level ORDER BY id"
        ));
    }

    @PostMapping("/levels")
    @Transactional
    public ResponseEntity<?> createLevel(@RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        if (blank(name)) return bad("اسم المرحلة مطلوب");

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE name = ?",
                Integer.class, name.trim());
        if (exists != null && exists > 0) return bad("المرحلة موجودة مسبقًا");

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.level(name) VALUES (?) RETURNING id",
                Long.class, name.trim());
        return ResponseEntity.ok(Map.of("message", "تمت إضافة المرحلة بنجاح", "id", id));
    }

    @PutMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> updateLevel(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        if (blank(name)) return bad("اسم المرحلة مطلوب");
        if (!exists("public.level", id)) return ResponseEntity.notFound().build();

        Integer duplicate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE name = ? AND id <> ?",
                Integer.class, name.trim(), id);
        if (duplicate != null && duplicate > 0) return bad("المرحلة موجودة مسبقًا");

        jdbcTemplate.update("UPDATE public.level SET name = ? WHERE id = ?", name.trim(), id);
        return ok("تم تعديل المرحلة بنجاح");
    }

    @DeleteMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> deleteLevel(@PathVariable Long id) {
        try {
            int deleted = jdbcTemplate.update("DELETE FROM public.level WHERE id = ?", id);
            return deleted == 0 ? ResponseEntity.notFound().build() : ok("تم حذف المرحلة بنجاح");
        } catch (Exception e) {
            return bad("لا يمكن حذف المرحلة لأنها مرتبطة بصفوف أو مواد");
        }
    }

    // =========================================================
    // GRADES
    // =========================================================

    @GetMapping("/grades")
    public ResponseEntity<List<Map<String, Object>>> getGrades() {
        return ResponseEntity.ok(jdbcTemplate.queryForList(
                "SELECT g.id, g.name, g.level_id, l.name AS level_name " +
                "FROM public.grade g " +
                "JOIN public.level l ON g.level_id = l.id " +
                "ORDER BY l.id, g.id"
        ));
    }

    @PostMapping("/grades")
    @Transactional
    public ResponseEntity<?> createGrade(@RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        if (blank(name)) return bad("اسم الصف مطلوب");
        if (levelId == null) return bad("المرحلة مطلوبة");
        if (!exists("public.level", levelId)) return bad("المرحلة غير موجودة");

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.grade WHERE name = ? AND level_id = ?",
                Integer.class, name.trim(), levelId);
        if (exists != null && exists > 0) return bad("الصف موجود مسبقًا في هذه المرحلة");

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.grade(name, level_id) VALUES (?, ?) RETURNING id",
                Long.class, name.trim(), levelId);
        return ResponseEntity.ok(Map.of("message", "تمت إضافة الصف بنجاح", "id", id));
    }

    @PutMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> updateGrade(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        if (blank(name)) return bad("اسم الصف مطلوب");
        if (levelId == null) return bad("المرحلة مطلوبة");
        if (!exists("public.grade", id)) return ResponseEntity.notFound().build();
        if (!exists("public.level", levelId)) return bad("المرحلة غير موجودة");

        Integer duplicate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.grade WHERE name = ? AND level_id = ? AND id <> ?",
                Integer.class, name.trim(), levelId, id);
        if (duplicate != null && duplicate > 0) return bad("الصف موجود مسبقًا في هذه المرحلة");

        jdbcTemplate.update(
                "UPDATE public.grade SET name = ?, level_id = ? WHERE id = ?",
                name.trim(), levelId, id);
        return ok("تم تعديل الصف بنجاح");
    }

    @DeleteMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> deleteGrade(@PathVariable Long id) {
        try {
            int deleted = jdbcTemplate.update("DELETE FROM public.grade WHERE id = ?", id);
            return deleted == 0 ? ResponseEntity.notFound().build() : ok("تم حذف الصف بنجاح");
        } catch (Exception e) {
            return bad("لا يمكن حذف الصف لأنه مرتبط بمواد");
        }
    }

    // =========================================================
    // SUBJECTS
    // =========================================================

    @GetMapping("/subjects")
    public ResponseEntity<List<Map<String, Object>>> getSubjects() {
        return ResponseEntity.ok(jdbcTemplate.queryForList(
                "SELECT s.id, s.name, s.level_id, l.name AS level_name, " +
                "s.grade_id, g.name AS grade_name " +
                "FROM public.subject s " +
                "JOIN public.level l ON s.level_id = l.id " +
                "JOIN public.grade g ON s.grade_id = g.id " +
                "ORDER BY l.id, g.id, s.id"
        ));
    }

    @PostMapping("/subjects")
    @Transactional
    public ResponseEntity<?> createSubject(@RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        Long gradeId = getLong(body, "gradeId");

        if (blank(name)) return bad("اسم المادة مطلوب");
        if (levelId == null) return bad("المرحلة مطلوبة");
        if (gradeId == null) return bad("الصف مطلوب");
        if (!exists("public.level", levelId)) return bad("المرحلة غير موجودة");

        Integer gradeExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.grade WHERE id = ? AND level_id = ?",
                Integer.class, gradeId, levelId);
        if (gradeExists == null || gradeExists == 0) return bad("الصف لا يتبع المرحلة المحددة");

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.subject WHERE name = ? AND level_id = ? AND grade_id = ?",
                Integer.class, name.trim(), levelId, gradeId);
        if (exists != null && exists > 0) return bad("المادة موجودة مسبقًا لهذا الصف");

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.subject(name, level_id, grade_id) VALUES (?, ?, ?) RETURNING id",
                Long.class, name.trim(), levelId, gradeId);
        return ResponseEntity.ok(Map.of("message", "تمت إضافة المادة بنجاح", "id", id));
    }

    @PutMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> updateSubject(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        Long gradeId = getLong(body, "gradeId");

        if (blank(name)) return bad("اسم المادة مطلوب");
        if (levelId == null || gradeId == null) return bad("المرحلة والصف مطلوبان");
        if (!exists("public.subject", id)) return ResponseEntity.notFound().build();

        Integer gradeExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.grade WHERE id = ? AND level_id = ?",
                Integer.class, gradeId, levelId);
        if (gradeExists == null || gradeExists == 0) return bad("الصف لا يتبع المرحلة المحددة");

        Integer duplicate = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.subject " +
                "WHERE name = ? AND level_id = ? AND grade_id = ? AND id <> ?",
                Integer.class, name.trim(), levelId, gradeId, id);
        if (duplicate != null && duplicate > 0) return bad("المادة موجودة مسبقًا لهذا الصف");

        jdbcTemplate.update(
                "UPDATE public.subject SET name = ?, level_id = ?, grade_id = ? WHERE id = ?",
                name.trim(), levelId, gradeId, id);
        return ok("تم تعديل المادة بنجاح");
    }

    @DeleteMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> deleteSubject(@PathVariable Long id) {
        try {
            int deleted = jdbcTemplate.update("DELETE FROM public.subject WHERE id = ?", id);
            return deleted == 0 ? ResponseEntity.notFound().build() : ok("تم حذف المادة بنجاح");
        } catch (Exception e) {
            return bad("لا يمكن حذف المادة لأنها مرتبطة ببيانات أخرى");
        }
    }

    // =========================================================
    // PLAN BANK
    // =========================================================

    @GetMapping("/plans")
    public ResponseEntity<List<Map<String, Object>>> getPlans() {
        String sql = "SELECT " +
                "p.id, p.term_id, t.name AS term_name, " +
                "p.subject_id, s.name AS subject_name, " +
                "s.level_id, l.name AS level_name, " +
                "s.grade_id, g.name AS grade_name, " +
                "p.lesson_topic, p.homework, p.notes " +
                "FROM public.plan_bank p " +
                "LEFT JOIN public.terms t ON p.term_id = t.id " +
                "JOIN public.subject s ON p.subject_id = s.id " +
                "JOIN public.grade g ON s.grade_id = g.id " +
                "JOIN public.level l ON s.level_id = l.id " +
                "ORDER BY p.id DESC";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    @PostMapping("/plans")
    @Transactional
    public ResponseEntity<?> createPlan(@RequestBody Map<String, Object> body) {
        Long termId = getLong(body, "termId");
        Long subjectId = getLong(body, "subjectId");
        String lessonTopic = getString(body, "lessonTopic");
        String homework = getString(body, "homework");
        String notes = getString(body, "notes");

        ResponseEntity<?> validation = validatePlan(termId, subjectId, lessonTopic);
        if (validation != null) return validation;

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.plan_bank " +
                "( subject_id, lesson_topic, homework, notes, term_id) " +
                "VALUES (?, ?, ?, ?, ?) RETURNING id",
                Long.class, termId, subjectId, lessonTopic.trim(), nullable(homework), nullable(notes));

        return ResponseEntity.ok(Map.of("message", "تمت إضافة موضوع الدرس بنجاح", "id", id));
    }

    @PostMapping("/plans/batch")
    @Transactional
    public ResponseEntity<?> createPlansBatch(@RequestBody Map<String, Object> body) {
        Long termId = getLong(body, "termId");
        Long subjectId = getLong(body, "subjectId");
        Object rawPlans = body.get("plans");

        if (!(rawPlans instanceof List<?> planRows) || planRows.isEmpty()) {
            return bad("لا توجد صفوف لاستيرادها");
        }
        if (planRows.size() > 500) return bad("الحد الأقصى للاستيراد هو 500 صف");

        for (Object rawPlan : planRows) {
            if (!(rawPlan instanceof Map<?, ?> row)) return bad("تنسيق صفوف الخطة غير صالح");
            Map<String, Object> plan = new HashMap<>();
            row.forEach((key, value) -> plan.put(String.valueOf(key), value));
            String lessonTopic = getString(plan, "lessonTopic");
            ResponseEntity<?> validation = validatePlan(termId, subjectId, lessonTopic);
            if (validation != null) return validation;
        }

        for (Object rawPlan : planRows) {
            Map<?, ?> row = (Map<?, ?>) rawPlan;
            String lessonTopic = row.get("lessonTopic") == null ? null : String.valueOf(row.get("lessonTopic"));
            String homework = row.get("homework") == null ? null : String.valueOf(row.get("homework"));
            String notes = row.get("notes") == null ? null : String.valueOf(row.get("notes"));
            jdbcTemplate.update(
                    "INSERT INTO public.plan_bank (term_id, subject_id, lesson_topic, homework, notes) VALUES (?, ?, ?, ?, ?)",
                    termId, subjectId, lessonTopic.trim(), nullable(homework), nullable(notes));
        }

        return ResponseEntity.ok(Map.of("message", "تم استيراد الخطة بنجاح", "count", planRows.size()));
    }

    @PutMapping("/plans/{id}")
    @Transactional
    public ResponseEntity<?> updatePlan(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (!exists("public.plan_bank", id)) return ResponseEntity.notFound().build();

        Long termId = getLong(body, "termId");
        Long subjectId = getLong(body, "subjectId");
        String lessonTopic = getString(body, "lessonTopic");
        String homework = getString(body, "homework");
        String notes = getString(body, "notes");

        ResponseEntity<?> validation = validatePlan(termId, subjectId, lessonTopic);
        if (validation != null) return validation;

        jdbcTemplate.update(
                "UPDATE public.plan_bank SET term_id = ?, subject_id = ?, " +
                "lesson_topic = ?, homework = ?, notes = ? WHERE id = ?",
                termId, subjectId, lessonTopic.trim(), nullable(homework), nullable(notes), id);

        return ok("تم تعديل موضوع الدرس بنجاح");
    }

    @DeleteMapping("/plans/{id}")
    @Transactional
    public ResponseEntity<?> deletePlan(@PathVariable Long id) {
        int deleted = jdbcTemplate.update("DELETE FROM public.plan_bank WHERE id = ?", id);
        return deleted == 0 ? ResponseEntity.notFound().build() : ok("تم حذف موضوع الدرس بنجاح");
    }

    private ResponseEntity<?> validatePlan(Long termId, Long subjectId, String lessonTopic) {
        if (termId == null) return bad("الفصل الدراسي مطلوب");
        if (subjectId == null) return bad("المادة مطلوبة");
        if (blank(lessonTopic)) return bad("موضوع الدرس مطلوب");
        if (!exists("public.terms", termId)) return bad("الفصل الدراسي غير موجود");
        if (!exists("public.subject", subjectId)) return bad("المادة غير موجودة");
        return null;
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private boolean exists(String table, Long id) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE id = ?",
                Integer.class, id);
        return count != null && count > 0;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String nullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String getString(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static Long getLong(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        try { return Long.valueOf(String.valueOf(value)); }
        catch (NumberFormatException e) { return null; }
    }

    private static ResponseEntity<Map<String, String>> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private static ResponseEntity<Map<String, String>> ok(String message) {
        return ResponseEntity.ok(Map.of("message", message));
    }
}
