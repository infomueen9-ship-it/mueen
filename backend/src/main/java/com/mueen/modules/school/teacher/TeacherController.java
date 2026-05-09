package com.mueen.modules.school.teacher;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/teachers")
@RequiredArgsConstructor
public class TeacherController {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
@GetMapping("/my-classrooms")
public ResponseEntity<?> getMyClassrooms(
        @PathVariable String schemaName,
        @RequestParam Long teacherId) {

    var classrooms = jdbcTemplate.queryForList(
        "SELECT DISTINCT c.id, c.name FROM " + schemaName + ".classrooms c " +
        "INNER JOIN " + schemaName + ".classroom_subjects cs ON cs.classroom_id = c.id " +
        "WHERE cs.teacher_id = ? ORDER BY c.id",
        teacherId
    );

    var result = classrooms.stream().map(row -> {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", row.get("id"));
        map.put("name", row.get("name"));
        return map;
    }).toList();

    return ResponseEntity.ok(result);
}
  @GetMapping
public ResponseEntity<?> getTeachers(@PathVariable String schemaName) {
    var teachers = jdbcTemplate.queryForList(
        "SELECT id, full_name, username, phone, password_hash FROM " + schemaName + ".teachers ORDER BY id"
    );
    var result = teachers.stream().map(row -> {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        // تحويل المفاتيح إلى حالة أحرف صغيرة لضمان التوافق مع مختلف قواعد البيانات
        java.util.Map<String, Object> lowerRow = new java.util.HashMap<>();
        row.forEach((k, v) -> lowerRow.put(k.toLowerCase(), v));

        map.put("id", lowerRow.get("id"));
        map.put("fullName", lowerRow.getOrDefault("full_name", ""));
        map.put("username", lowerRow.getOrDefault("username", ""));
        
        Object pwd = lowerRow.get("password_hash");
        if (pwd == null) pwd = lowerRow.get("password");
        map.put("password", pwd != null ? pwd.toString() : "");
        
        map.put("phone", lowerRow.getOrDefault("phone", ""));
        return map;
    }).toList();
    return ResponseEntity.ok(result);
}
    @PostMapping
    public ResponseEntity<?> addTeacher(
            @PathVariable String schemaName,
            @RequestBody Map<String, String> body) {

        String phone = body.get("phone");
        String username = body.get("username");

        if (phone != null && !phone.isBlank()) {
            var existing = jdbcTemplate.queryForList(
                "SELECT id FROM " + schemaName + ".teachers WHERE phone = ?", phone
            );
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "رقم الجوال " + phone + " مسجل مسبقاً")
                );
            }
        }

        if (username != null && !username.isBlank()) {
            var existing = jdbcTemplate.queryForList(
                "SELECT id FROM " + schemaName + ".teachers WHERE username = ?", username
            );
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Map.of("message", "اسم المستخدم " + username + " مسجل مسبقاً")
                );
            }
        }

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".teachers (full_name, username, password_hash, phone) VALUES (?, ?, ?, ?)",
            body.get("fullName"),
            username,
            passwordEncoder.encode(body.get("password")),
            phone
        );
        return ResponseEntity.ok(Map.of("message", "Teacher added successfully"));
    }

    @DeleteMapping("/{teacherId}")
    public ResponseEntity<?> deleteTeacher(
            @PathVariable String schemaName,
            @PathVariable Long teacherId) {

        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".teachers WHERE id = ?", teacherId
        );
        return ResponseEntity.ok(Map.of("message", "Teacher deleted"));
    }
    @PutMapping("/{teacherId}")
public ResponseEntity<?> updateTeacher(
        @PathVariable String schemaName,
        @PathVariable Long teacherId,
        @RequestBody Map<String, String> body) {

    String password = body.get("password");
    if (password != null && !password.isBlank()) {
        jdbcTemplate.update(
            "UPDATE " + schemaName + ".teachers SET full_name = ?, username = ?, phone = ?, password_hash = ? WHERE id = ?",
            body.get("fullName"),
            body.get("username"),
            body.get("phone"),
            passwordEncoder.encode(password),
            teacherId
        );
    } else {
        jdbcTemplate.update(
            "UPDATE " + schemaName + ".teachers SET full_name = ?, username = ?, phone = ? WHERE id = ?",
            body.get("fullName"),
            body.get("username"),
            body.get("phone"),
            teacherId
        );
    }
    return ResponseEntity.ok(Map.of("message", "Teacher updated"));
}

    @GetMapping("/{teacherId}/assignments")
    public ResponseEntity<?> getTeacherAssignments(
            @PathVariable String schemaName,
            @PathVariable Long teacherId) {

        var assignments = jdbcTemplate.queryForList(
            "SELECT c.name as classroom_name, s.name as subject_name " +
            "FROM " + schemaName + ".classroom_subjects s " +
            "JOIN " + schemaName + ".classrooms c ON s.classroom_id = c.id " +
            "WHERE s.teacher_id = ? " +
            "ORDER BY c.name, s.name",
            teacherId
        );

        var result = assignments.stream().map(row -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("classroomName", row.getOrDefault("classroom_name", ""));
            map.put("subjectName", row.getOrDefault("subject_name", ""));
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }
}