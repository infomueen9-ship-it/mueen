package com.mueen.modules.school.classroom;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/attendance")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AttendanceController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * سجل الحضور التفصيلي لفصل معين
     * =========================================================
     *
     * GET:
     * /api/school/{schemaName}/attendance/classroom/{classroomId}
     */
    @GetMapping("/classroom/{classroomId}")
    public ResponseEntity<?> getClassroomAttendance(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {
        try {
            String sql = """
                SELECT a.id, a.date, a.status, s.full_name AS student_name
                FROM %s.attendance a
                JOIN %s.students s ON s.id = a.student_id
                WHERE a.classroom_id = ?
                ORDER BY a.date DESC, s.full_name
                """.formatted(schemaName, schemaName);

            List<Map<String, Object>> rows =
                    jdbcTemplate.queryForList(sql, classroomId);

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", row.get("id"));
                map.put("date", row.get("date"));
                map.put("status", row.get("status"));
                map.put("studentName", row.get("student_name"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل سجل الحضور"));
        }
    }

    @GetMapping("/summary") // تم تغيير المسار لإزالة classroomId، حيث أن الواجهة الأمامية تستدعي بدونها
    public ResponseEntity<?> getClassroomsAttendanceSummary( // تم إعادة تسمية الدالة للوضوح
            @PathVariable String schemaName) {
        try {
            // استعلام SQL لجلب ملخص الحضور لجميع الفصول الدراسية لليوم الحالي
            // يقوم بحساب إجمالي الطلاب، الطلاب الحاضرين، والطلاب الغائبين لكل فصل.
            // يتم استخدام حالة 'absence' للطلاب الغائبين، بما يتماشى مع TeacherStudent.tsx.
            String sql = """
                SELECT
                    c.id,
                    c.name,
                    COALESCE(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END), 0) as present_students,
                    COALESCE(SUM(CASE WHEN a.status = 'absence' THEN 1 ELSE 0 END), 0) as absent_students,
                    COALESCE(COUNT(DISTINCT se.student_id), 0) as total_students
                FROM
                    %s.classrooms c
                LEFT JOIN
                    %s.student_enrollments se ON c.id = se.classroom_id
                LEFT JOIN
                    %s.attendance a ON se.student_id = a.student_id AND c.id = a.classroom_id AND a.date = CURRENT_DATE
                GROUP BY
                    c.id, c.name
                ORDER BY
                    c.name;
                """.formatted(schemaName, schemaName, schemaName);

            List<Map<String, Object>> rawSummaries = jdbcTemplate.queryForList(sql);

            List<Map<String, Object>> formattedSummaries = rawSummaries.stream().map(row -> {
                Map<String, Object> formattedRow = new java.util.HashMap<>();
                // تحويل المفاتيح من snake_case إلى camelCase وحساب نسبة الحضور
                // نفترض أن 'id' و 'name' موجودان بالفعل بالشكل الصحيح
                formattedRow.put("id", row.get("id"));
                formattedRow.put("name", row.get("name"));

                int totalStudents = ((Number) row.get("total_students")).intValue();
                int presentStudents = ((Number) row.get("present_students")).intValue();
                int absentStudents = ((Number) row.get("absent_students")).intValue();
                

                double attendancePercentage = (totalStudents > 0) ? ((double) presentStudents / totalStudents) * 100 : 0.0;

                formattedRow.put("totalStudents", totalStudents);
                formattedRow.put("presentStudents", presentStudents);
                formattedRow.put("absentStudents", absentStudents);
                formattedRow.put("attendancePercentage", attendancePercentage);

                return formattedRow;
            }).toList();

            return ResponseEntity.ok(formattedSummaries);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل ملخص الحضور"));
        }
    }

    @GetMapping("/teacher/{teacherId}/summary")
    public ResponseEntity<?> getTeacherAttendanceSummary(
            @PathVariable String schemaName,
            @PathVariable Long teacherId) {
        try {
            // جلب ملخص الحضور لكل الفصول التي يدرسها المعلم
            // تم التحديث ليتوافق مع أنواع حالات الحضور من TeacherStudent.tsx (present, absence, delay, permission)
            String sql = """
                SELECT
                    c.id as classroom_id,
                    c.name as classroom_name,
                    COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count,
                    COUNT(a.id) FILTER (WHERE a.status = 'absence') as absence_count
                FROM %s.classroom_subjects cs
                JOIN %s.classrooms c ON cs.classroom_id = c.id
                LEFT JOIN %s.attendance a ON a.classroom_id = c.id AND a.date = CURRENT_DATE
                WHERE cs.teacher_id = ?
                GROUP BY c.id, c.name
                """.formatted(schemaName, schemaName, schemaName);

            var summary = jdbcTemplate.queryForList(sql, teacherId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            e.printStackTrace();
            // هذه هي الرسالة التي تظهر لك في الواجهة الأمامية
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل ملخص الحضور"));
        }
    }
}