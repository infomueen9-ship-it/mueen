package com.mueen.modules.platform.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/settings")
@RequiredArgsConstructor
public class SchoolSettingsController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<?> getSchoolSettings(@PathVariable String schemaName) {
        try {
            Map<String, Object> settings = jdbcTemplate.queryForMap(
                "SELECT school_name_ar FROM " + schemaName + ".school_settings LIMIT 1"
            );
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}