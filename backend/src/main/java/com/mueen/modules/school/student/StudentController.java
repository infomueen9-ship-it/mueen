package com.mueen.modules.school.student;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Objects;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/students")
@RequiredArgsConstructor
public class StudentController {

    private final JdbcTemplate jdbcTemplate;

    // Record for student form data
    public record StudentForm(String fullName, String guardianPhone) {}

    @GetMapping
    public ResponseEntity<?> getStudents(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        // ensureStudentSchema(schemaName); 

        // Query students from 'students' table and join with 'student_enrollments'
        // Also fetch the latest behavior score
        var students = jdbcTemplate.queryForList(
            "SELECT s.id, s.full_name, s.guardian_phone, " +
            "(SELECT expected_score FROM " + schemaName + ".student_behavior sb WHERE sb.student_id = s.id ORDER BY sb.created_at DESC LIMIT 1) as current_score " +
            "FROM " + schemaName + ".students s " +
            "JOIN " + schemaName + ".student_enrollments se ON s.id = se.student_id " +
            "WHERE se.classroom_id = ? ORDER BY s.id",
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
    @Transactional
    public ResponseEntity<?> addStudents(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody List<StudentForm> students) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        ensureStudentSchema(schemaName);

        for (var student : students) {
            String phone = (student.guardianPhone() == null || student.guardianPhone().isBlank()) 
                ? null : student.guardianPhone().trim();
            
            // 1. التحقق من تكرار رقم الجوال في جدول الطلاب العام
            if (phone != null) {
                var existing = jdbcTemplate.queryForList(
                    "SELECT id FROM " + schemaName + ".students WHERE guardian_phone = ?",
                    phone
                );
                if (!existing.isEmpty()) {
                    return ResponseEntity.badRequest().body(
                        Map.of("message", "رقم الجوال " + phone + " مسجل مسبقاً لطالب آخر")
                    );
                }
            }

            // 2. إدخال الطالب في جدول الطلاب وجلب المعرف الجديد
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO " + schemaName + ".classroom_students (full_name, guardian_phone) VALUES (?, ?)",
                    new String[]{"id"}
                );
                ps.setString(1, student.fullName());
                ps.setString(2, phone);
                return ps;
            }, keyHolder);

            Long studentId = Objects.requireNonNull(keyHolder.getKey()).longValue();

            // 3. ربط الطالب بالفصل الدراسي (Enrollment)
            jdbcTemplate.update(
                "INSERT INTO " + schemaName + ".student_enrollments (student_id, classroom_id) VALUES (?, ?)",
                studentId, classroomId
            );
        }
        return ResponseEntity.ok(Map.of("message", "تم إضافة الطلاب بنجاح"));
    }

    @DeleteMapping("/{studentId}")
    @Transactional
    public ResponseEntity<?> deleteStudent(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long studentId) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        // حذف الارتباط بالفصل أولاً
        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".student_enrollments WHERE student_id = ? AND classroom_id = ?",
            studentId, classroomId
        );

        // تحقق إذا كان الطالب مسجلاً في فصول أخرى، إذا لم يكن، احذفه نهائياً مع سجلاته
        Integer otherClasses = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + schemaName + ".student_enrollments WHERE student_id = ?",
            Integer.class, studentId
        );

        if (otherClasses == null || otherClasses == 0) {
            jdbcTemplate.update("DELETE FROM " + schemaName + ".student_behavior WHERE student_id = ?", studentId);
            jdbcTemplate.update("DELETE FROM " + schemaName + ".students WHERE id = ?", studentId);
        }

        return ResponseEntity.ok(Map.of("message", "تم حذف الطالب بنجاح"));
    }

    private void ensureStudentSchema(String schemaName) {
        try {
            // إنشاء جدول الطلاب
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".students (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "full_name VARCHAR(255) NOT NULL, " +
                    "guardian_phone VARCHAR(20) UNIQUE, " +
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

            // إنشاء جدول الربط بالفصول
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".student_enrollments (" +
                    "student_id BIGINT REFERENCES " + schemaName + ".students(id) ON DELETE CASCADE, " +
                    "classroom_id BIGINT REFERENCES " + schemaName + ".classrooms(id) ON DELETE CASCADE, " +
                    "PRIMARY KEY (student_id, classroom_id))");

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
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
                    "FOREIGN KEY (student_id) REFERENCES " + schemaName + ".students(id) ON DELETE CASCADE)");
        } catch (Exception e) {
            // تجاهل أخطاء الـ DDL البسيطة لضمان استمرار عمل الـ API
        }
    }
}
