package com.mueen.modules.school.message;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<?> getMessages(@PathVariable String schemaName) {
        var rows = jdbcTemplate.queryForList(
            "SELECT id, recipient_type, recipient_name, category, subject, content, send_type, status, scheduled_date, created_at FROM " + schemaName + ".messages ORDER BY id DESC"
        );
        var result = rows.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", row.get("id"));
            map.put("recipientType", row.getOrDefault("recipient_type", ""));
            map.put("recipientName", row.getOrDefault("recipient_name", ""));
            map.put("category", row.getOrDefault("category", ""));
            map.put("subject", row.getOrDefault("subject", ""));
            map.put("content", row.getOrDefault("content", ""));
            map.put("sendType", row.getOrDefault("send_type", ""));
            map.put("status", row.getOrDefault("status", ""));
            map.put("scheduledDate", row.getOrDefault("scheduled_date", ""));
            map.put("createdAt", row.get("created_at") != null ? row.get("created_at").toString() : "");
            return map;
        }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @PathVariable String schemaName,
            @RequestBody Map<String, String> body) {

        String status = "مجدول".equals(body.get("sendType")) ? "مجدولة" : "مرسلة";
        String recipientName = "كافة الطلاب".equals(body.get("recipientType")) ? "جميع الطلاب" : body.getOrDefault("recipientId", "");

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".messages (recipient_type, recipient_name, category, subject, content, send_type, status, scheduled_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            body.get("recipientType"),
            recipientName,
            body.get("category"),
            body.get("subject"),
            body.get("content"),
            body.get("sendType"),
            status,
            body.get("scheduledDate")
        );
        return ResponseEntity.ok(Map.of("message", "Message sent successfully"));
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable String schemaName,
            @PathVariable Long messageId) {

        jdbcTemplate.update("DELETE FROM " + schemaName + ".messages WHERE id = ?", messageId);
        return ResponseEntity.ok(Map.of("message", "Message deleted"));
    }
}