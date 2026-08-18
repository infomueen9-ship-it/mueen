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
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/week-plans")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WeekPlanController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * جلب خطط كل الأسابيع لفصل (لعرض سجل الواجبات كاملاً)
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getAllWeekPlans(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {
        try {
            ensureSchema(schemaName);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT week_number, day, period, subject_name, lesson_topic, homework " +
                    "FROM " + schemaName + ".classroom_week_plans " +
                    "WHERE classroom_id = ? " +
                    "ORDER BY week_number, day, period",
                    classroomId
            );

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("weekNumber", row.get("week_number"));
                map.put("day", row.get("day"));
                map.put("period", row.get("period"));
                map.put("subjectName", row.get("subject_name"));
                map.put("lessonTopic", row.get("lesson_topic"));
                map.put("homework", row.get("homework"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل خطط الأسابيع"));
        }
    }

    /*
     * =========================================================
     * جلب خطة أسبوع معين لفصل
     * =========================================================
     */
    @GetMapping("/{weekNumber}")
    public ResponseEntity<?> getWeekPlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Integer weekNumber) {
        try {
            ensureSchema(schemaName);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT day, period, subject_name, lesson_topic, homework " +
                    "FROM " + schemaName + ".classroom_week_plans " +
                    "WHERE classroom_id = ? AND week_number = ?",
                    classroomId, weekNumber
            );

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("day", row.get("day"));
                map.put("period", row.get("period"));
                map.put("subjectName", row.get("subject_name"));
                map.put("lessonTopic", row.get("lesson_topic"));
                map.put("homework", row.get("homework"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل خطة الأسبوع"));
        }
    }

    /*
     * =========================================================
     * حفظ خطة أسبوع معين (استبدال كامل لصفوف هذا الأسبوع)
     * =========================================================
     *
     * Body: [{ "day": "الأحد", "period": "1", "subjectName": "كيمياء",
     *          "lessonTopic": "...", "homework": "..." }, ...]
     */
    @PostMapping("/{weekNumber}")
    @Transactional
    public ResponseEntity<?> saveWeekPlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Integer weekNumber,
            @RequestBody List<Map<String, Object>> entries) {
        try {
            ensureSchema(schemaName);

            String sql =
                    "INSERT INTO " + schemaName + ".classroom_week_plans " +
                    "(classroom_id, week_number, day, period, subject_name, lesson_topic, homework) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?) " +
                    "ON CONFLICT (classroom_id, week_number, day, period) " +
                    "DO UPDATE SET subject_name = EXCLUDED.subject_name, " +
                    "lesson_topic = EXCLUDED.lesson_topic, " +
                    "homework = EXCLUDED.homework";

            for (Map<String, Object> entry : entries) {

                String day = str(entry.get("day"));
                String period = str(entry.get("period"));
                String subjectName = str(entry.get("subjectName"));

                if (day == null || period == null || subjectName == null) {
                    continue;
                }

                jdbcTemplate.update(
                        sql,
                        classroomId,
                        weekNumber,
                        day,
                        period,
                        subjectName,
                        str(entry.get("lessonTopic")),
                        str(entry.get("homework"))
                );
            }

            return ResponseEntity.ok(Map.of("message", "تم حفظ خطة الأسبوع بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حفظ خطة الأسبوع"));
        }
    }

    private void ensureSchema(String schemaName) {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + schemaName + ".classroom_week_plans (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "classroom_id BIGINT NOT NULL REFERENCES " + schemaName + ".classrooms(id) ON DELETE CASCADE, " +
                "week_number INTEGER NOT NULL, " +
                "day VARCHAR(20) NOT NULL, " +
                "period VARCHAR(10) NOT NULL, " +
                "subject_name VARCHAR(100) NOT NULL, " +
                "lesson_topic TEXT, " +
                "homework TEXT, " +
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
                "UNIQUE(classroom_id, week_number, day, period))"
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
