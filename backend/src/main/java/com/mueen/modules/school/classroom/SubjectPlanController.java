package com.mueen.modules.school.classroom;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/subjects/{subjectId}/plan")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SubjectPlanController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * جلب الخطة اليدوية (يوم/حصة) لمادة معينة
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getPlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long subjectId) {
        try {
            ensureSchema(schemaName);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, day, period, subject, lesson_topic, homework " +
                    "FROM " + schemaName + ".classroom_subject_plans " +
                    "WHERE classroom_id = ? AND subject_id = ? " +
                    "ORDER BY id",
                    classroomId, subjectId
            );

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", row.get("id"));
                map.put("day", row.get("day"));
                map.put("period", row.get("period"));
                map.put("subject", row.get("subject"));
                map.put("lesson", row.get("lesson_topic"));
                map.put("homework", row.get("homework"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل الخطة"));
        }
    }

    /*
     * =========================================================
     * حفظ الخطة اليدوية (استبدال كامل لصفوف هذه المادة)
     * =========================================================
     *
     * Body: [{ "day": "الأحد", "period": "1", "subject": "رياضيات",
     *          "lesson": "...", "homework": "..." }, ...]
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> savePlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long subjectId,
            @RequestBody List<Map<String, Object>> entries) {
        try {
            ensureSchema(schemaName);

            jdbcTemplate.update(
                    "DELETE FROM " + schemaName + ".classroom_subject_plans " +
                    "WHERE classroom_id = ? AND subject_id = ?",
                    classroomId, subjectId
            );

            for (Map<String, Object> entry : entries) {

                String day = str(entry.get("day"));
                String period = str(entry.get("period"));

                if (day == null || period == null) {
                    continue;
                }

                jdbcTemplate.update(
                        "INSERT INTO " + schemaName + ".classroom_subject_plans " +
                        "(classroom_id, subject_id, day, period, subject, lesson_topic, homework) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        classroomId,
                        subjectId,
                        day,
                        period,
                        str(entry.get("subject")),
                        str(entry.get("lesson")),
                        str(entry.get("homework"))
                );
            }

            return ResponseEntity.ok(Map.of("message", "تم حفظ الخطة بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حفظ الخطة"));
        }
    }

    private void ensureSchema(String schemaName) {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + schemaName + ".classroom_subject_plans (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "classroom_id BIGINT NOT NULL REFERENCES " + schemaName + ".classrooms(id) ON DELETE CASCADE, " +
                "subject_id BIGINT NOT NULL REFERENCES " + schemaName + ".classroom_subjects(id) ON DELETE CASCADE, " +
                "day VARCHAR(20) NOT NULL, " +
                "period VARCHAR(10) NOT NULL, " +
                "subject VARCHAR(100), " +
                "lesson_topic TEXT, " +
                "homework TEXT, " +
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
        );
    }

    private static String str(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
