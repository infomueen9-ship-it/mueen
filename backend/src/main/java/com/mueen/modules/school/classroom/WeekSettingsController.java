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
@RequestMapping("/api/school/{schemaName}/week-settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WeekSettingsController {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * جلب تقويم الأسابيع الدراسية للمدرسة
     * =========================================================
     */
    @GetMapping
    public ResponseEntity<?> getWeeks(@PathVariable String schemaName) {
        try {
            ensureSchema(schemaName);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT week_number, start_date, end_date " +
                    "FROM " + schemaName + ".week_settings " +
                    "ORDER BY week_number"
            );

            List<Map<String, Object>> result = rows.stream().map(row -> {
                Map<String, Object> map = new HashMap<>();
                map.put("weekNumber", row.get("week_number"));
                map.put("startDate", row.get("start_date"));
                map.put("endDate", row.get("end_date"));
                return map;
            }).toList();

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل إعدادات الخطة"));
        }
    }

    /*
     * =========================================================
     * إضافة/تعديل أسبوع دراسي
     * =========================================================
     *
     * Body: { "weekNumber": 1, "startDate": "2026-08-16", "endDate": "2026-08-22" }
     */
    @PostMapping
    public ResponseEntity<?> saveWeek(
            @PathVariable String schemaName,
            @RequestBody Map<String, Object> body) {
        try {
            ensureSchema(schemaName);

            Integer weekNumber = getInteger(body.get("weekNumber"));
            String startDate = getString(body.get("startDate"));
            String endDate = getString(body.get("endDate"));

            if (weekNumber == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "رقم الأسبوع مطلوب"));
            }

            if (startDate == null || endDate == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "تاريخ البداية والنهاية مطلوبان"));
            }

            if (startDate.compareTo(endDate) > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "تاريخ البداية يجب أن يكون قبل تاريخ النهاية"));
            }

            jdbcTemplate.update(
                    "INSERT INTO " + schemaName + ".week_settings (week_number, start_date, end_date) " +
                    "VALUES (?, ?, ?) " +
                    "ON CONFLICT (week_number) " +
                    "DO UPDATE SET start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date",
                    weekNumber,
                    Date.valueOf(startDate),
                    Date.valueOf(endDate)
            );

            return ResponseEntity.ok(Map.of("message", "تم حفظ الأسبوع بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حفظ الأسبوع"));
        }
    }

    /*
     * =========================================================
     * حذف أسبوع دراسي
     * =========================================================
     */
    @DeleteMapping("/{weekNumber}")
    public ResponseEntity<?> deleteWeek(
            @PathVariable String schemaName,
            @PathVariable Integer weekNumber) {
        try {
            ensureSchema(schemaName);

            int deleted = jdbcTemplate.update(
                    "DELETE FROM " + schemaName + ".week_settings WHERE week_number = ?",
                    weekNumber
            );

            if (deleted == 0) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(Map.of("message", "تم حذف الأسبوع بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حذف الأسبوع"));
        }
    }

    private void ensureSchema(String schemaName) {
        jdbcTemplate.execute(
                "CREATE TABLE IF NOT EXISTS " + schemaName + ".week_settings (" +
                "week_number INTEGER PRIMARY KEY, " +
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

    private static Integer getInteger(Object value) {
        if (value == null) {
            return null;
        }
        try {
            if (value instanceof Number number) {
                return number.intValue();
            }
            return Integer.parseInt(value.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
