package com.mueen.modules.school.student;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/students")
@RequiredArgsConstructor
public class StudentController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<?> getStudents(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        ensureStudentSchema(schemaName);

        var students = jdbcTemplate.queryForList(
            "SELECT cs.id, cs.full_name, cs.guardian_phone, " +
            "(SELECT expected_score FROM " + schemaName + ".student_behavior sb WHERE sb.student_id = cs.id ORDER BY sb.created_at DESC LIMIT 1) as current_score " +
            "FROM " + schemaName + ".classroom_students cs " +
            "WHERE cs.classroom_id = ? ORDER BY cs.id",
            classroomId
        );

        var result = students.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", row.get("id"));
            map.put("fullName", row.get("full_name"));
            map.put("guardianPhone", row.get("guardian_phone") != null ? row.get("guardian_phone") : "");
            Object score = row.get("current_score");
            map.put("expected_score", score != null ? score : 80);
            map.put("behavior_score", score != null ? score : 80);
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }
@PostMapping("/batch")
public ResponseEntity<?> addStudents(
        @PathVariable String schemaName,
        @PathVariable Long classroomId,
        @RequestBody List<Map<String, String>> students) {

    for (var student : students) {
        String phone = student.get("guardianPhone");
        
        // تحقق من تكرار رقم الجوال
        if (phone != null && !phone.isBlank()) {
            var existing = jdbcTemplate.queryForList(
                "SELECT id FROM " + schemaName + ".classroom_students WHERE guardian_phone = ?",
                phone
            );
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "رقم الجوال " + phone + " مسجل مسبقاً")
                );
            }
        }

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".classroom_students (classroom_id, full_name, guardian_phone) VALUES (?, ?, ?)",
            classroomId,
            student.get("fullName"),
            phone
        );
    }
    return ResponseEntity.ok(Map.of("message", "Students added successfully"));
}

    @DeleteMapping("/{studentId}")
    public ResponseEntity<?> deleteStudent(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long studentId) {

        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".classroom_students WHERE id = ? AND classroom_id = ?",
            studentId, classroomId
        );
        return ResponseEntity.ok(Map.of("message", "Student deleted"));
    }

    private void ensureStudentSchema(String schemaName) {
        try {
            // التأكد من وجود جدول سجل السلوك
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".student_behavior (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "student_id BIGINT NOT NULL, " +
                    "statement TEXT NOT NULL, " +
                    "operation_type VARCHAR(10) NOT NULL, " +
                    "points INT NOT NULL, " +
                    "expected_score INT NOT NULL DEFAULT 80, " +
                    "evidence_type VARCHAR(20), " +
                    "evidence_url TEXT, " +
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
        } catch (Exception e) {
            // تجاهل أخطاء الـ DDL البسيطة لضمان استمرار عمل الـ API
        }
    }
}
