package com.mueen.modules.school.classroom;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}")
@RequiredArgsConstructor
public class ClassroomSubjectController {

    private final JdbcTemplate jdbcTemplate;

    // ── المواد ─────────────────────────────────

    @GetMapping("/subjects")
    public ResponseEntity<?> getSubjects(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        var subjects = jdbcTemplate.queryForList(
            "SELECT id, name, teacher_id FROM " + schemaName + ".classroom_subjects WHERE classroom_id = ? ORDER BY id",
            classroomId
        );
        var result = subjects.stream().map(row -> {
            // توحيد حالة أحرف المفاتيح (Normalization) لتجنب أخطاء التسمية بين DB و Java
            java.util.Map<String, Object> lowerRow = new java.util.HashMap<>();
            row.forEach((k, v) -> lowerRow.put(k.toLowerCase(), v));

            java.util.Map<String, Object> resultMap = new java.util.HashMap<>();
            resultMap.put("id", lowerRow.get("id"));
            resultMap.put("name", lowerRow.get("name"));
            resultMap.put("teacherId", lowerRow.get("teacher_id"));
            return resultMap;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/subjects")
    public ResponseEntity<?> addSubject(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody Map<String, String> body) {

        String name = body.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "اسم المادة مطلوب"));
        }

        // التحقق من وجود المادة مسبقاً لتجنب الأخطاء
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM " + schemaName + ".classroom_subjects WHERE classroom_id = ? AND name = ?",
            Integer.class, classroomId, name.trim()
        );

        if (count != null && count > 0) {
            return ResponseEntity.ok(Map.of("message", "Subject already exists"));
        }

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".classroom_subjects (classroom_id, name) VALUES (?, ?) ON CONFLICT (classroom_id, name) DO NOTHING",
            classroomId, name.trim()
        );

        return ResponseEntity.ok(Map.of("message", "Subject added"));
    }

    @DeleteMapping("/subjects/{subjectId}")
    public ResponseEntity<?> deleteSubject(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long subjectId) {

        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".classroom_subjects WHERE id = ? AND classroom_id = ?",
            subjectId, classroomId
        );
        return ResponseEntity.ok(Map.of("message", "Subject deleted"));
    }

    // ── الجدول ─────────────────────────────────

    @GetMapping("/schedule")
    public ResponseEntity<?> getSchedule(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        var rows = jdbcTemplate.queryForList(
            "SELECT period, day, subject_name FROM " + schemaName + ".classroom_schedule WHERE classroom_id = ?",
            classroomId
        );
        var result = rows.stream().map(row -> {
            java.util.Map<String, Object> lowerRow = new java.util.HashMap<>();
            row.forEach((k, v) -> lowerRow.put(k.toLowerCase(), v));

            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("period", lowerRow.get("period"));
            map.put("day", lowerRow.get("day"));
            map.put("subject_name", lowerRow.getOrDefault("subject_name", ""));
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> saveSchedule(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody List<Map<String, String>> schedule) {

        for (var entry : schedule) {
            jdbcTemplate.update(
                "INSERT INTO " + schemaName + ".classroom_schedule (classroom_id, period, day, subject_name) " +
                "VALUES (?, ?, ?, ?) ON CONFLICT (classroom_id, period, day) DO UPDATE SET subject_name = EXCLUDED.subject_name",
                classroomId, entry.get("period"), entry.get("day"), entry.get("subject_name")
            );
        }
        return ResponseEntity.ok(Map.of("message", "Schedule saved"));
    }

    // ── ربط المعلم بالمواد ─────────────────────────────────

    @PutMapping("/subjects/assign-teacher")
    public ResponseEntity<?> assignTeacherToSubjects(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody Map<String, Object> body) {

        if (!body.containsKey("teacherId") || !body.containsKey("subjectIds")) {
            return ResponseEntity.badRequest().body(Map.of("message", "مطلوب teacherId و subjectIds"));
        }

        Long teacherId = ((Number) body.get("teacherId")).longValue();
        
        // تحويل قائمة المعرفات بشكل آمن لتجنب أخطاء النوع
        List<?> rawIds = (List<?>) body.get("subjectIds");
        List<Long> subjectIds = rawIds.stream()
                .map(id -> ((Number) id).longValue())
                .toList();

        // الخطوة 1: إزالة إسناد المعلم من جميع المواد في هذا الفصل
        // هذا يضمن أن المواد التي لم يتم تحديدها في الطلب ستصبح غير مسندة للمعلم
        jdbcTemplate.update(
            "UPDATE " + schemaName + ".classroom_subjects " +
            "SET teacher_id = NULL " +
            "WHERE classroom_id = ? AND teacher_id = ?",
            classroomId, teacherId
        );

        // الخطوة 2: إسناد المعلم للمواد المحددة
        if (!subjectIds.isEmpty()) {
            String updateSelectedSql = "UPDATE " + schemaName + ".classroom_subjects SET teacher_id = ? WHERE id = ? AND classroom_id = ?";
            List<Object[]> batchArgs = subjectIds.stream()
                    .map(sId -> new Object[]{teacherId, sId, classroomId})
                    .toList();
            jdbcTemplate.batchUpdate(updateSelectedSql, batchArgs);
        }

        return ResponseEntity.ok(Map.of("message", "تم ربط المواد بنجاح"));
    }
}