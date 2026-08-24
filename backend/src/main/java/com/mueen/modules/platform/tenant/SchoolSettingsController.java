package com.mueen.modules.platform.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/settings")
@RequiredArgsConstructor
public class SchoolSettingsController {
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<?> getSchoolSettings(@PathVariable String schemaName) {
        try {
            Map<String, Object> row = jdbcTemplate.queryForMap(
                "SELECT school_name_ar, general_directorate, education_department, school_phone, school_mobile " +
                "FROM " + schemaName + ".school_settings LIMIT 1"
            );
            Map<String, Object> result = new HashMap<>();
            result.put("schoolNameAr", row.get("school_name_ar"));
            result.put("generalDirectorate", row.get("general_directorate"));
            result.put("educationDepartment", row.get("education_department"));
            result.put("schoolPhone", row.get("school_phone"));
            result.put("schoolMobile", row.get("school_mobile"));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of());
        }
    }

    @PutMapping
    public ResponseEntity<?> updateSchoolSettings(
            @PathVariable String schemaName,
            @RequestBody Map<String, Object> body) {
        try {
            String schoolNameAr = getString(body.get("schoolNameAr"));
            String generalDirectorate = getString(body.get("generalDirectorate"));
            String educationDepartment = getString(body.get("educationDepartment"));
            String schoolPhone = getString(body.get("schoolPhone"));
            String schoolMobile = getString(body.get("schoolMobile"));

            if (schoolNameAr == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "اسم المدرسة مطلوب"));
            }

            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + schemaName + ".school_settings", Integer.class
            );

            if (count != null && count > 0) {
                jdbcTemplate.update(
                    "UPDATE " + schemaName + ".school_settings SET " +
                    "school_name_ar = ?, general_directorate = ?, education_department = ?, school_phone = ?, school_mobile = ?, updated_at = NOW()",
                    schoolNameAr, generalDirectorate, educationDepartment, schoolPhone, schoolMobile
                );
            } else {
                jdbcTemplate.update(
                    "INSERT INTO " + schemaName + ".school_settings " +
                    "(school_name, school_name_ar, general_directorate, education_department, school_phone, school_mobile) " +
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    schoolNameAr, schoolNameAr, generalDirectorate, educationDepartment, schoolPhone, schoolMobile
                );
            }

            return ResponseEntity.ok(Map.of("message", "تم حفظ الإعدادات بنجاح"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر حفظ الإعدادات"));
        }
    }

    private static String getString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }
}
