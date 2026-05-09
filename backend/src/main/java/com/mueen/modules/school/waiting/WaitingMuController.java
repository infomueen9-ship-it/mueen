package com.mueen.modules.school.waiting;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/waiting")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WaitingMuController {

    private final JdbcTemplate jdbcTemplate;

    // --- حصص الانتظار ---

    @GetMapping("/substitute")
    public ResponseEntity<?> getSubstitutes(
            @PathVariable String schemaName, 
            @RequestParam(required = false) Long teacherId,
            @RequestHeader(value = "X-User-Role", required = false) String role, // مثال لجلب الدور
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId // المعرف من التوكن
    ) {
        // إذا كان المستخدم "معلم"، نجبره على رؤية بياناته فقط بغض النظر عما أرسله الفرونت إند
        Long finalId = "TEACHER".equals(role) ? authenticatedUserId : teacherId;

        String sql = "SELECT s.*, t.full_name as teacher_full_name, c.name as classroom_name " +
                     "FROM " + schemaName + ".substitute_schedules s " +
                     "LEFT JOIN " + schemaName + ".teachers t ON s.teacher_id = t.id " +
                     "LEFT JOIN " + schemaName + ".classrooms c ON s.classroom_id = c.id ";
        
        if (finalId != null) {
            sql += "WHERE s.teacher_id = ? ";
            sql += "ORDER BY s.scheduled_date DESC, s.period ASC";
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, finalId));
        }

        sql += "ORDER BY s.scheduled_date DESC, s.period ASC";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    @PostMapping("/substitute")
    @Transactional
    public ResponseEntity<?> saveSubstitute(@PathVariable String schemaName, @RequestBody Map<String, Object> body) {
        String sql = "INSERT INTO " + schemaName + ".substitute_schedules " +
                     "(executor_type, teacher_id, admin_name, admin_phone, classroom_id, scheduled_date, period, notes) " +
                     "VALUES (?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?)";
        
        jdbcTemplate.update(sql,
                body.get("executorType"),
                body.get("teacherId"),
                body.get("adminName"),
                body.get("adminPhone"),
                body.get("classroomId"),
                body.get("date"),
                body.get("period"),
                body.get("notes")
        );
        return ResponseEntity.ok(Map.of("message", "تم الحفظ بنجاح"));
    }

    @PutMapping("/substitute/{id}")
    @Transactional
    public ResponseEntity<?> updateSubstitute(@PathVariable String schemaName, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        String sql = "UPDATE " + schemaName + ".substitute_schedules SET " +
                     "executor_type = ?, teacher_id = ?, admin_name = ?, admin_phone = ?, " +
                     "classroom_id = ?, scheduled_date = CAST(? AS DATE), period = ?, notes = ? " +
                     "WHERE id = ?";
        
        jdbcTemplate.update(sql,
                body.get("executorType"),
                body.get("teacherId"),
                body.get("adminName"),
                body.get("adminPhone"),
                body.get("classroomId"),
                body.get("date"),
                body.get("period"),
                body.get("notes"),
                id
        );
        return ResponseEntity.ok(Map.of("message", "تم التحديث بنجاح"));
    }

    @DeleteMapping("/substitute/{id}")
    public ResponseEntity<?> deleteSubstitute(@PathVariable String schemaName, @PathVariable Long id) {
        jdbcTemplate.update("DELETE FROM " + schemaName + ".substitute_schedules WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("message", "تم الحذف"));
    }

    // --- المناوبات ---

    @GetMapping("/duty")
    public ResponseEntity<?> getDuties(
            @PathVariable String schemaName, 
            @RequestParam(required = false) Long teacherId,
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId
    ) {
        Long finalId = "TEACHER".equals(role) ? authenticatedUserId : teacherId;

        String sql = "SELECT d.*, t.full_name as teacher_full_name " +
                     "FROM " + schemaName + ".duty_schedules d " +
                     "LEFT JOIN " + schemaName + ".teachers t ON d.teacher_id = t.id ";

        if (finalId != null) {
            sql += "WHERE d.teacher_id = ? ";
            sql += "ORDER BY d.scheduled_date DESC";
            return ResponseEntity.ok(jdbcTemplate.queryForList(sql, finalId));
        }

        sql += "ORDER BY d.scheduled_date DESC";
        return ResponseEntity.ok(jdbcTemplate.queryForList(sql));
    }

    @PostMapping("/duty")
    @Transactional
    public ResponseEntity<?> saveDuty(@PathVariable String schemaName, @RequestBody Map<String, Object> body) {
        String sql = "INSERT INTO " + schemaName + ".duty_schedules " +
                     "(executor_type, teacher_id, admin_name, admin_phone, location, scheduled_date, notes) " +
                     "VALUES (?, ?, ?, ?, ?, CAST(? AS DATE), ?)";

        jdbcTemplate.update(sql,
                body.get("executorType"),
                body.get("teacherId"),
                body.get("adminName"),
                body.get("adminPhone"),
                body.get("location"),
                body.get("date"),
                body.get("notes")
        );
        return ResponseEntity.ok(Map.of("message", "تم حفظ المناوبة"));
    }

    @PutMapping("/duty/{id}")
    @Transactional
    public ResponseEntity<?> updateDuty(@PathVariable String schemaName, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        String sql = "UPDATE " + schemaName + ".duty_schedules SET " +
                     "executor_type = ?, teacher_id = ?, admin_name = ?, admin_phone = ?, " +
                     "location = ?, scheduled_date = CAST(? AS DATE), notes = ? " +
                     "WHERE id = ?";

        jdbcTemplate.update(sql,
                body.get("executorType"),
                body.get("teacherId"),
                body.get("adminName"),
                body.get("adminPhone"),
                body.get("location"),
                body.get("date"),
                body.get("notes"),
                id
        );
        return ResponseEntity.ok(Map.of("message", "تم تحديث المناوبة"));
    }

    @DeleteMapping("/duty/{id}")
    public ResponseEntity<?> deleteDuty(@PathVariable String schemaName, @PathVariable Long id) {
        jdbcTemplate.update("DELETE FROM " + schemaName + ".duty_schedules WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("message", "تم الحذف"));
    }
}