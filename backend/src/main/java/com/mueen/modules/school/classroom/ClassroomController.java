package com.mueen.modules.school.classroom;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*") // السماح لطلبات الواجهة الأمامية بالوصول
@RequestMapping("/api/school/{schemaName}/classrooms")
@RequiredArgsConstructor
public class ClassroomController {

    private final JdbcTemplate jdbcTemplate;

    @PostMapping
    @Transactional // لضمان أن العملية تتم ككل أو لا تتم أبداً
    public ResponseEntity<?> createClassroom(
            @PathVariable String schemaName,
            @RequestBody CreateClassroomRequest request) {

        if (request == null || request.name() == null || request.name().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "اسم الفصل مطلوب"));
        }

        final String name = request.name().trim();

        // التحقق من عدم تكرار الاسم قبل الإضافة
        Integer count = jdbcTemplate.queryForObject(
            "SELECT count(*) FROM " + schemaName + ".classrooms WHERE name = ?",
            Integer.class, name
        );
        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "عذراً، هذا الفصل موجود مسبقاً"));
        }

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".classrooms (name) VALUES (?)",
            name
        );

        return ResponseEntity.ok(Map.of("message", "Classroom created successfully"));
    }

    @GetMapping
    public ResponseEntity<?> getClassrooms(@PathVariable String schemaName) {
        var classrooms = jdbcTemplate.queryForList(
            "SELECT c.id, c.name, " +
            "(SELECT COUNT(*) FROM " + schemaName + ".student_enrollments se WHERE se.classroom_id = c.id) as student_count " +
            "FROM " + schemaName + ".classrooms c ORDER BY c.id"
        );

        var result = classrooms.stream().map(row -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            // تحويل المفاتيح لحالة أحرف صغيرة لضمان التوافق
            java.util.Map<String, Object> lowerRow = new java.util.HashMap<>();
            row.forEach((k, v) -> lowerRow.put(k.toLowerCase(), v));

            map.put("id", lowerRow.get("id"));
            map.put("name", lowerRow.get("name"));
            Object count = lowerRow.get("student_count");
            map.put("studentCount", count != null ? ((Number) count).intValue() : 0);
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{classroomId}")
    @Transactional // لضمان أن عملية الحذف تتم ككل أو لا تتم أبداً
    public ResponseEntity<?> deleteClassroom(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        // حذف السجلات المرتبطة أولاً لتجنب خطأ قيود المفتاح الأجنبي
        jdbcTemplate.update("DELETE FROM " + schemaName + ".student_enrollments WHERE classroom_id = ?", classroomId);

        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".classrooms WHERE id = ?",
            classroomId
        );

        return ResponseEntity.ok(Map.of("message", "Classroom deleted successfully"));
    }

    public record CreateClassroomRequest(String name) {}
}