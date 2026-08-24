package com.mueen.modules.school.classroom;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/leaves")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SchoolLeaveController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * جلب الإجازات المضافة للمدرسة
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getLeaves(@PathVariable String schemaName) {
        try {
            ensureSchema(schemaName);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, title, start_date, end_date " +
                    "FROM " + schemaName + ".school_leaves " +
                    "ORDER BY start_date"
            );

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", row.get("id"));
                map.put("title", row.get("title"));
                map.put("startDate", row.get("start_date"));
                map.put("endDate", row.get("end_date"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل الإجازات"));
        }
    }

    /*
     * =========================================================
     * إضافة إجازة
     * =========================================================
     *
     * Body: { "title": "إجازة اليوم الوطني", "startDate": "2026-09-23", "endDate": "2026-09-24" }
     */
    @PostMapping
    public ResponseEntity<?> addLeave(
            @PathVariable String schemaName,
            @RequestBody Map<String, Object> body) {
        try {
            ensureSchema(schemaName);

            String title = getString(body.get("title"));
            String startDate = getString(body.get("startDate"));
            String endDate = getString(body.get("endDate"));

            if (title == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "يرجى إدخال اسم أو وصف الإجازة"));
            }

            if (startDate == null || endDate == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "تاريخ البداية والنهاية مطلوبان"));
            }

            if (startDate.compareTo(endDate) > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"));
            }

            jdbcTemplate.update(
                    "INSERT INTO " + schemaName + ".school_leaves (title, start_date, end_date) VALUES (?, ?, ?)",
                    title,
                    Date.valueOf(startDate),
                    Date.valueOf(endDate)
            );

            return ResponseEntity.ok(Map.of("message", "تمت إضافة الإجازة بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر إضافة الإجازة"));
        }
    }

    /*
     * =========================================================
     * حذف إجازة
     * =========================================================
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteLeave(
            @PathVariable String schemaName,
            @PathVariable Long id) {
        try {
            ensureSchema(schemaName);

            int deleted = jdbcTemplate.update(
                    "DELETE FROM " + schemaName + ".school_leaves WHERE id = ?",
                    id
            );

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(Map.of("message", "تم حذف الإجازة بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حذف الإجازة"));
        }
    }

    private void ensureSchema(String schemaName) {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + schemaName + ".school_leaves (" +
                "id BIGSERIAL PRIMARY KEY, " +
                "title TEXT NOT NULL, " +
                "start_date DATE NOT NULL, " +
                "end_date DATE NOT NULL, " +
                "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
        );
    }

    private static String getString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
