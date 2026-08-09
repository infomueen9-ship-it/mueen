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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/admin/study-plans")
@CrossOrigin(origins = "*")
public class StudyPlansController {

    private final JdbcTemplate jdbcTemplate;

    // =========================================================
    // INITIALIZATION
    // =========================================================

    private void ensureAllTables() {
        ensureTermsTable();
        ensureLevelsTable();
        ensureGradesTable();
        ensureSubjectsTable();
        ensurePlanBankTable();
    }

    // =========================================================
    // TERMS
    // =========================================================

    @GetMapping("/terms")
    public ResponseEntity<List<Map<String, Object>>> getTerms() {

        ensureTermsTable();

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(
                        "SELECT id, name " +
                        "FROM public.terms " +
                        "ORDER BY id"
                )
        );
    }

    @PostMapping("/terms")
    @Transactional
    public ResponseEntity<?> createTerm(
            @RequestBody Map<String, Object> body
    ) {

        ensureTermsTable();

        String name = getString(body, "name");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الفصل الدراسي مطلوب"));
        }

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.terms WHERE name = ?",
                Integer.class,
                name.trim()
        );

        if (count != null && count > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الفصل الدراسي موجود مسبقًا"));
        }

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.terms (name) " +
                "VALUES (?) " +
                "RETURNING id",
                Long.class,
                name.trim()
        );

        return ResponseEntity.ok(
                Map.of(
                        "message", "تمت إضافة الفصل الدراسي بنجاح",
                        "id", id
                )
        );
    }

    @PutMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> updateTerm(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureTermsTable();

        String name = getString(body, "name");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الفصل الدراسي مطلوب"));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.terms WHERE id = ?",
                Integer.class,
                id
        );

        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }

        try {

            jdbcTemplate.update(
                    "UPDATE public.terms " +
                    "SET name = ? " +
                    "WHERE id = ?",
                    name.trim(),
                    id
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن تعديل الفصل الدراسي: قد يكون الاسم مستخدمًا بالفعل"
                    ));
        }

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل الفصل الدراسي بنجاح")
        );
    }

    @DeleteMapping("/terms/{id}")
    @Transactional
    public ResponseEntity<?> deleteTerm(
            @PathVariable Long id
    ) {

        ensureTermsTable();

        int deleted = jdbcTemplate.update(
                "DELETE FROM public.terms WHERE id = ?",
                id
        );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف الفصل الدراسي بنجاح")
        );
    }

    // =========================================================
    // LEVELS
    // =========================================================

    @GetMapping("/levels")
    public ResponseEntity<List<Map<String, Object>>> getLevels() {

        ensureLevelsTable();

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(
                        "SELECT id, name " +
                        "FROM public.level " +
                        "ORDER BY id"
                )
        );
    }

    @PostMapping("/levels")
    @Transactional
    public ResponseEntity<?> createLevel(
            @RequestBody Map<String, Object> body
    ) {

        ensureLevelsTable();

        String name = getString(body, "name");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المرحلة مطلوب"));
        }

        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE name = ?",
                Integer.class,
                name.trim()
        );

        if (count != null && count > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة موجودة مسبقًا"));
        }

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.level (name) " +
                "VALUES (?) " +
                "RETURNING id",
                Long.class,
                name.trim()
        );

        return ResponseEntity.ok(
                Map.of(
                        "message", "تمت إضافة المرحلة بنجاح",
                        "id", id
                )
        );
    }

    @PutMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> updateLevel(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureLevelsTable();

        String name = getString(body, "name");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المرحلة مطلوب"));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE id = ?",
                Integer.class,
                id
        );

        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }

        try {

            jdbcTemplate.update(
                    "UPDATE public.level " +
                    "SET name = ? " +
                    "WHERE id = ?",
                    name.trim(),
                    id
            );

        } catch (Exception e) {

            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "لا يمكن تعديل المرحلة"
                    ));
        }

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل المرحلة بنجاح")
        );
    }

    @DeleteMapping("/levels/{id}")
    @Transactional
    public ResponseEntity<?> deleteLevel(
            @PathVariable Long id
    ) {

        ensureLevelsTable();

        int deleted = jdbcTemplate.update(
                "DELETE FROM public.level WHERE id = ?",
                id
        );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف المرحلة بنجاح")
        );
    }

    // =========================================================
    // GRADES
    // =========================================================

    @GetMapping("/grades")
    public ResponseEntity<List<Map<String, Object>>> getGrades() {

        ensureGradesTable();

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(
                        "SELECT " +
                        "g.id, " +
                        "g.name, " +
                        "g.level_id, " +
                        "l.name AS level_name " +
                        "FROM public.grade g " +
                        "JOIN public.level l ON g.level_id = l.id " +
                        "ORDER BY l.id, g.id"
                )
        );
    }

    @PostMapping("/grades")
    @Transactional
    public ResponseEntity<?> createGrade(
            @RequestBody Map<String, Object> body
    ) {

        ensureGradesTable();

        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الصف مطلوب"));
        }

        if (levelId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة مطلوبة"));
        }

        Integer levelExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE id = ?",
                Integer.class,
                levelId
        );

        if (levelExists == null || levelExists == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة غير موجودة"));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " +
                "FROM public.grade " +
                "WHERE name = ? AND level_id = ?",
                Integer.class,
                name.trim(),
                levelId
        );

        if (exists != null && exists > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الصف موجود مسبقًا في هذه المرحلة"));
        }

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.grade (name, level_id) " +
                "VALUES (?, ?) " +
                "RETURNING id",
                Long.class,
                name.trim(),
                levelId
        );

        return ResponseEntity.ok(
                Map.of(
                        "message", "تمت إضافة الصف بنجاح",
                        "id", id
                )
        );
    }

    @PutMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> updateGrade(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureGradesTable();

        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم الصف مطلوب"));
        }

        if (levelId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة مطلوبة"));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.grade WHERE id = ?",
                Integer.class,
                id
        );

        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }

        jdbcTemplate.update(
                "UPDATE public.grade " +
                "SET name = ?, level_id = ? " +
                "WHERE id = ?",
                name.trim(),
                levelId,
                id
        );

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل الصف بنجاح")
        );
    }

    @DeleteMapping("/grades/{id}")
    @Transactional
    public ResponseEntity<?> deleteGrade(
            @PathVariable Long id
    ) {

        ensureGradesTable();

        int deleted = jdbcTemplate.update(
                "DELETE FROM public.grade WHERE id = ?",
                id
        );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف الصف بنجاح")
        );
    }

    // =========================================================
    // SUBJECTS
    // =========================================================

    @GetMapping("/subjects")
    public ResponseEntity<List<Map<String, Object>>> getSubjects() {

        ensureSubjectsTable();

        return ResponseEntity.ok(
                jdbcTemplate.queryForList(
                        "SELECT " +
                        "s.id, " +
                        "s.name, " +
                        "s.level_id, " +
                        "s.grade_id, " +
                        "l.name AS level_name, " +
                        "g.name AS grade_name " +
                        "FROM public.subject s " +
                        "JOIN public.level l ON s.level_id = l.id " +
                        "JOIN public.grade g ON s.grade_id = g.id " +
                        "ORDER BY l.id, g.id, s.id"
                )
        );
    }

    @PostMapping("/subjects")
    @Transactional
    public ResponseEntity<?> createSubject(
            @RequestBody Map<String, Object> body
    ) {

        ensureSubjectsTable();

        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        Long gradeId = getLong(body, "gradeId");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المادة مطلوب"));
        }

        if (levelId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة مطلوبة"));
        }

        if (gradeId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الصف مطلوب"));
        }

        Integer levelExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.level WHERE id = ?",
                Integer.class,
                levelId
        );

        if (levelExists == null || levelExists == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "المرحلة غير موجودة"));
        }

        Integer gradeExists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " +
                "FROM public.grade " +
                "WHERE id = ? AND level_id = ?",
                Integer.class,
                gradeId,
                levelId
        );

        if (gradeExists == null || gradeExists == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "الصف لا يتبع المرحلة المحددة"
                    ));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " +
                "FROM public.subject " +
                "WHERE name = ? " +
                "AND level_id = ? " +
                "AND grade_id = ?",
                Integer.class,
                name.trim(),
                levelId,
                gradeId
        );

        if (exists != null && exists > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "المادة موجودة مسبقًا لهذا الصف"
                    ));
        }

        Long id = jdbcTemplate.queryForObject(
                "INSERT INTO public.subject " +
                "(name, level_id, grade_id) " +
                "VALUES (?, ?, ?) " +
                "RETURNING id",
                Long.class,
                name.trim(),
                levelId,
                gradeId
        );

        return ResponseEntity.ok(
                Map.of(
                        "message", "تمت إضافة المادة بنجاح",
                        "id", id
                )
        );
    }

    @PutMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> updateSubject(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {

        ensureSubjectsTable();

        String name = getString(body, "name");
        Long levelId = getLong(body, "levelId");
        Long gradeId = getLong(body, "gradeId");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "اسم المادة مطلوب"));
        }

        if (levelId == null || gradeId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "المرحلة والصف مطلوبان"
                    ));
        }

        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM public.subject WHERE id = ?",
                Integer.class,
                id
        );

        if (exists == null || exists == 0) {
            return ResponseEntity.notFound().build();
        }

        Integer validGrade = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) " +
                "FROM public.grade " +
                "WHERE id = ? AND level_id = ?",
                Integer.class,
                gradeId,
                levelId
        );

        if (validGrade == null || validGrade == 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "الصف لا يتبع المرحلة المحددة"
                    ));
        }

        jdbcTemplate.update(
                "UPDATE public.subject " +
                "SET name = ?, level_id = ?, grade_id = ? " +
                "WHERE id = ?",
                name.trim(),
                levelId,
                gradeId,
                id
        );

        return ResponseEntity.ok(
                Map.of("message", "تم تعديل المادة بنجاح")
        );
    }

    @DeleteMapping("/subjects/{id}")
    @Transactional
    public ResponseEntity<?> deleteSubject(
            @PathVariable Long id
    ) {

        ensureSubjectsTable();

        int deleted = jdbcTemplate.update(
                "DELETE FROM public.subject WHERE id = ?",
                id
        );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف المادة بنجاح")
        );
    }

    // =========================================================
    // PLAN UPLOAD
    // =========================================================

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @Transactional
    public ResponseEntity<?> uploadPlan(
            @RequestParam String gradeLevel,
            @RequestParam String subject,
            @RequestParam(required = false) String classroomName,
            @RequestParam String createdBy,
            @RequestParam MultipartFile file
    ) throws IOException {

        ensurePlanBankTable();

        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "الملف مطلوب"));
        }

        jdbcTemplate.update(
                "INSERT INTO public.plan_bank " +
                "(grade_level, classroom_name, subject, file_name, " +
                "file_data, file_size, created_by) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                gradeLevel,
                classroomName,
                subject,
                file.getOriginalFilename(),
                file.getBytes(),
                (int) file.getSize(),
                createdBy
        );

        return ResponseEntity.ok(
                Map.of("message", "تم رفع الخطة بنجاح")
        );
    }

    // =========================================================
    // GET PLANS
    // =========================================================

    @GetMapping("/plans")
    public ResponseEntity<?> getPlans() {

        ensurePlanBankTable();

        List<Map<String, Object>> plans =
                jdbcTemplate.queryForList(
                        "SELECT id, grade_level, classroom_name, " +
                        "subject, file_name, file_size, created_by, created_at " +
                        "FROM public.plan_bank " +
                        "ORDER BY created_at DESC"
                );

        List<Map<String, Object>> result =
                plans.stream()
                        .map(row -> {

                            Map<String, Object> map =
                                    new HashMap<>();

                            map.put(
                                    "id",
                                    row.get("id")
                            );

                            map.put(
                                    "gradeLevel",
                                    row.getOrDefault(
                                            "grade_level",
                                            ""
                                    )
                            );

                            map.put(
                                    "classroomName",
                                    row.getOrDefault(
                                            "classroom_name",
                                            ""
                                    )
                            );

                            map.put(
                                    "subject",
                                    row.getOrDefault(
                                            "subject",
                                            ""
                                    )
                            );

                            map.put(
                                    "fileName",
                                    row.getOrDefault(
                                            "file_name",
                                            ""
                                    )
                            );

                            map.put(
                                    "fileSize",
                                    row.getOrDefault(
                                            "file_size",
                                            0
                                    )
                            );

                            map.put(
                                    "createdBy",
                                    row.getOrDefault(
                                            "created_by",
                                            ""
                                    )
                            );

                            map.put(
                                    "createdAt",
                                    row.get("created_at") != null
                                            ? row.get("created_at").toString()
                                            : ""
                            );

                            return map;
                        })
                        .toList();

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // DOWNLOAD PLAN
    // =========================================================

    @GetMapping("/plans/{id}/download")
    public ResponseEntity<byte[]> downloadPlan(
            @PathVariable Long id
    ) {

        ensurePlanBankTable();

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(
                        "SELECT file_name, file_data " +
                        "FROM public.plan_bank " +
                        "WHERE id = ?",
                        id
                );

        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String fileName =
                (String) rows.get(0).get("file_name");

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

        ensurePlanBankTable();

        int deleted =
                jdbcTemplate.update(
                        "DELETE FROM public.plan_bank " +
                        "WHERE id = ?",
                        id
                );

        if (deleted == 0) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of("message", "تم حذف الخطة")
        );
    }

    // =========================================================
    // DATABASE TABLES
    // =========================================================

    private void ensureTermsTable() {

        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS public.terms (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "name VARCHAR(100) NOT NULL UNIQUE)"
        );

    
    }

    private void ensureLevelsTable() {

        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS public.level (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "name VARCHAR(100) NOT NULL UNIQUE)"
        );

      
    }

    private void ensureGradesTable() {

        ensureLevelsTable();

        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS public.grade (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "name VARCHAR(100) NOT NULL, " +
                "level_id BIGINT NOT NULL " +
                "REFERENCES public.level(id) " +
                "ON DELETE CASCADE)"
        );

        // منع تكرار نفس الصف داخل نفس المرحلة
        jdbcTemplate.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS " +
                "idx_grade_name_level " +
                "ON public.grade(name, level_id)"
        );
    }

    private void ensureSubjectsTable() {

        ensureLevelsTable();
        ensureGradesTable();

        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS public.subject (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "name VARCHAR(150) NOT NULL, " +
                "level_id BIGINT NOT NULL " +
                "REFERENCES public.level(id) " +
                "ON DELETE CASCADE, " +
                "grade_id BIGINT NOT NULL " +
                "REFERENCES public.grade(id) " +
                "ON DELETE CASCADE)"
        );

        // منع تكرار المادة لنفس المرحلة والصف
        jdbcTemplate.execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS " +
                "idx_subject_name_level_grade " +
                "ON public.subject(name, level_id, grade_id)"
        );
    }

    private void ensurePlanBankTable() {

        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS public.plan_bank (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "grade_level VARCHAR(50) NOT NULL, " +
                "classroom_name VARCHAR(50), " +
                "subject VARCHAR(100) NOT NULL, " +
                "file_name VARCHAR(255) NOT NULL, " +
                "file_data BYTEA NOT NULL, " +
                "file_size INTEGER, " +
                "created_by VARCHAR(100), " +
                "created_at TIMESTAMPTZ NOT NULL " +
                "DEFAULT NOW())"
        );
    }

    // =========================================================
    // HELPERS
    // =========================================================

    private String getString(
            Map<String, Object> body,
            String key
    ) {

        Object value = body.get(key);

        if (value == null) {
            return null;
        }

        return value.toString().trim();
    }

    private Long getLong(
            Map<String, Object> body,
            String key
    ) {

        Object value = body.get(key);

        if (value == null) {
            return null;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}