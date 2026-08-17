package com.mueen.modules.school.behavior;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/behavior")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ClassroomBehaviorController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * سجل السلوك الكامل لفصل معين
     * =========================================================
     *
     * GET:
     * /api/school/{schemaName}/classrooms/{classroomId}/behavior
     */
    @GetMapping
    public ResponseEntity<?> getClassroomBehavior(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {
        try {
            String sql = """
                SELECT sb.id, sb.statement, sb.operation_type, sb.points, sb.expected_score,
                       sb.evidence_type, sb.evidence_url, sb.created_at,
                       s.id AS student_id, s.full_name AS student_name
                FROM %s.student_behavior sb
                JOIN %s.students s ON s.id = sb.student_id
                JOIN %s.student_enrollments se ON se.student_id = s.id
                WHERE se.classroom_id = ?
                ORDER BY sb.created_at DESC
                """.formatted(schemaName, schemaName, schemaName);

            List<Map<String, Object>> rows =
                    jdbcTemplate.queryForList(sql, classroomId);

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", row.get("id"));
                map.put("statement", row.get("statement"));
                map.put("operationType", row.get("operation_type"));
                map.put("points", row.get("points"));
                map.put("expectedScore", row.get("expected_score"));
                map.put("evidenceType", row.get("evidence_type"));
                map.put("evidenceUrl", row.get("evidence_url"));
                map.put("createdAt", row.get("created_at"));
                map.put("studentId", row.get("student_id"));
                map.put("studentName", row.get("student_name"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل سجل السلوك"));
        }
    }
}
