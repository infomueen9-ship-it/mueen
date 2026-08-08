package com.mueen.modules.platform.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import java.io.IOException;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/admin/study-plans")
public class StudyPlansController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/terms")
    public ResponseEntity<List<Map<String, Object>>> getTerms() {
        ensureTermsTable();
        List<Map<String, Object>> terms = jdbcTemplate.queryForList(
            "SELECT id, name FROM public.terms ORDER BY id"
        );
        return ResponseEntity.ok(terms);
    }

    @GetMapping("/levels")
    public ResponseEntity<List<Map<String, Object>>> getLevels() {
        ensureLevelsTable();
        List<Map<String, Object>> levels = jdbcTemplate.queryForList(
            "SELECT id, name FROM public.level ORDER BY id"
        );
        return ResponseEntity.ok(levels);
    }

    @GetMapping("/grades")
    public ResponseEntity<List<Map<String, Object>>> getGrades() {
        ensureGradesTable();
        List<Map<String, Object>> grades = jdbcTemplate.queryForList(
            "SELECT id, name, level_id FROM public.grade ORDER BY id"
        );
        return ResponseEntity.ok(grades);
    }

    private void ensureTermsTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.terms (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)");
        jdbcTemplate.execute("INSERT INTO public.terms (name) VALUES ('الفصل الدراسي الأول') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.terms (name) VALUES ('الفصل الدراسي الثاني') ON CONFLICT (name) DO NOTHING");
    }

    private void ensureLevelsTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.level (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('ابتدائي') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('متوسط') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('ثانوي') ON CONFLICT (name) DO NOTHING");
    }

    private void ensureGradesTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.grade (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, level_id BIGINT NOT NULL REFERENCES public.level(id) ON DELETE CASCADE)");

        jdbcTemplate.queryForList("SELECT id FROM public.level WHERE name = 'مرحلة الروضة' LIMIT 1").stream().findFirst().ifPresent(level -> {
            Long levelId = ((Number) level.get("id")).longValue();
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الاول', " + levelId + ") ON CONFLICT DO NOTHING");
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الثاني', " + levelId + ") ON CONFLICT DO NOTHING");
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الثالث', " + levelId + ") ON CONFLICT DO NOTHING");
        });
    }
    @PostMapping("/upload")
public ResponseEntity<?> uploadPlan(
        @RequestParam String gradeLevel,
        @RequestParam String subject,
        @RequestParam(required = false) String classroomName,
        @RequestParam String createdBy,
        @RequestParam MultipartFile file) throws IOException {

    ensurePlanBankTable();

    jdbcTemplate.update(
        "INSERT INTO public.plan_bank (grade_level, classroom_name, subject, file_name, file_data, file_size, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        gradeLevel,
        classroomName,
        subject,
        file.getOriginalFilename(),
        file.getBytes(),
        (int) file.getSize(),
        createdBy
    );

    return ResponseEntity.ok(Map.of("message", "تم رفع الخطة بنجاح"));
}

// جلب كل الخطط
@GetMapping("/plans")
public ResponseEntity<?> getPlans() {
    ensurePlanBankTable();
    var plans = jdbcTemplate.queryForList(
        "SELECT id, grade_level, classroom_name, subject, file_name, file_size, created_by, created_at FROM public.plan_bank ORDER BY created_at DESC"
    );
    var result = plans.stream().map(row -> {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", row.get("id"));
        map.put("gradeLevel", row.getOrDefault("grade_level", ""));
        map.put("classroomName", row.getOrDefault("classroom_name", ""));
        map.put("subject", row.getOrDefault("subject", ""));
        map.put("fileName", row.getOrDefault("file_name", ""));
        map.put("fileSize", row.getOrDefault("file_size", 0));
        map.put("createdBy", row.getOrDefault("created_by", ""));
        map.put("createdAt", row.get("created_at") != null ? row.get("created_at").toString() : "");
        return map;
    }).toList();
    return ResponseEntity.ok(result);
}

// تحميل خطة
@GetMapping("/plans/{id}/download")
public ResponseEntity<byte[]> downloadPlan(@PathVariable Long id) {
    ensurePlanBankTable();
    var rows = jdbcTemplate.queryForList(
        "SELECT file_name, file_data FROM public.plan_bank WHERE id = ?", id
    );
    if (rows.isEmpty()) return ResponseEntity.notFound().build();

    String fileName = (String) rows.get(0).get("file_name");
    byte[] fileData = (byte[]) rows.get(0).get("file_data");

    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
        .contentType(MediaType.APPLICATION_OCTET_STREAM)
        .body(fileData);
}

// حذف خطة
@DeleteMapping("/plans/{id}")
public ResponseEntity<?> deletePlan(@PathVariable Long id) {
    jdbcTemplate.update("DELETE FROM public.plan_bank WHERE id = ?", id);
    return ResponseEntity.ok(Map.of("message", "تم حذف الخطة"));
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
        "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
    );
}
}
