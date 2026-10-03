package com.mueen.modules.school.message;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/message-templates")
@RequiredArgsConstructor
public class MessageTemplateController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<?> getTemplates(@PathVariable String schemaName) {
        var rows = jdbcTemplate.queryForList(
            "SELECT id, name, category, subject, content FROM " + schemaName + ".message_templates ORDER BY id DESC"
        );
        var result = rows.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", row.get("id"));
            map.put("name", row.getOrDefault("name", ""));
            map.put("category", row.getOrDefault("category", ""));
            map.put("subject", row.getOrDefault("subject", ""));
            map.put("content", row.getOrDefault("content", ""));
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> addTemplate(
            @PathVariable String schemaName,
            @RequestBody Map<String, String> body) {

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".message_templates (name, category, subject, content) VALUES (?, ?, ?, ?)",
            body.get("name"), body.get("category"), body.get("subject"), body.get("content")
        );
        return ResponseEntity.ok(Map.of("message", "Template saved"));
    }

    @DeleteMapping("/{templateId}")
    public ResponseEntity<?> deleteTemplate(
            @PathVariable String schemaName,
            @PathVariable Long templateId) {

        jdbcTemplate.update("DELETE FROM " + schemaName + ".message_templates WHERE id = ?", templateId);
        return ResponseEntity.ok(Map.of("message", "Template deleted"));
    }
}
