package com.mueen.modules.school.behavior;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.MediaType;

import java.io.File;
import java.nio.file.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/students/{studentId}/behavior")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BehaviorController {

    private final JdbcTemplate jdbcTemplate;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> saveBehavior(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long studentId,
            @RequestParam("statement") String statement,
            @RequestParam("operationType") String operationType,
            @RequestParam("points") Integer points,
            @RequestParam("expectedScore") Integer expectedScore,
            @RequestParam(value = "evidenceType", required = false) String evidenceType,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        // Validate required fields
        if (statement == null || statement.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "نص البيان إلزامي"));
        }
        if (points == null || points <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "عدد النقاط يجب أن يكون أكبر من صفر"));
        }
        if (operationType == null || (!operationType.equals("add") && !operationType.equals("deduct"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "نوع العملية غير صالح"));
        }

        try {
            String savedUrl = null;

            // Handle file upload if present
            if (file != null && !file.isEmpty()) {
                String uploadDir = "uploads/behavior/" + schemaName + "/";
                File dir = new File(uploadDir);
                if (!dir.exists()) dir.mkdirs();

                String extension = "";
                String originalName = file.getOriginalFilename();
                if (originalName != null && originalName.contains(".")) {
                    extension = originalName.substring(originalName.lastIndexOf("."));
                }
                
                String fileName = UUID.randomUUID().toString() + extension;
                Path path = Paths.get(uploadDir + fileName);
                Files.write(path, file.getBytes());
                
                // This URL should be accessible via a static resource handler
                savedUrl = "/api/uploads/behavior/" + schemaName + "/" + fileName;
            }

            // 1. Insert into student_behavior log
            jdbcTemplate.update(
                    "INSERT INTO " + schemaName + ".student_behavior " +
                            "(student_id, statement, operation_type, points, expected_score, evidence_type, evidence_url, created_at) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                    studentId,
                    statement,
                    operationType,
                    points,
                    expectedScore,
                    evidenceType,
                    savedUrl
            );

            return ResponseEntity.ok(Map.of(
                "message", "تم حفظ السلوك بنجاح",
                "expectedScore", expectedScore
            ));
        } catch (Exception e) {
            // التأكد من عدم وجود قيمة null في رسالة الخطأ لتجنب NPE
            String errorMsg = e.getMessage() != null ? e.getMessage() : "Internal Database Error";
            System.err.println("[Behavior Error] Schema: " + schemaName + " | StudentID: " + studentId + " | Msg: " + errorMsg);
            e.printStackTrace();

            String userFriendlyMsg = "خطأ في الخادم: " + errorMsg;
            String lowerMsg = errorMsg.toLowerCase();
            if (lowerMsg.contains("relation") && lowerMsg.contains("does not exist")) {
                userFriendlyMsg = "جدول سجل السلوك (student_behavior) غير موجود في هذه المدرسة.";
            } else if (lowerMsg.contains("expected_score") && (lowerMsg.contains("column") || lowerMsg.contains("grammar"))) {
                userFriendlyMsg = "عمود expected_score مفقود من جدول الطلاب أو جدول السلوك. يرجى مراجعة قاعدة البيانات.";
            } else if (errorMsg.contains("violates foreign key constraint")) {
                userFriendlyMsg = "فشل في الربط: تأكد من صحة بيانات الطالب والجدول في قاعدة البيانات.";
            }

            return ResponseEntity.status(500).body(Map.of("message", userFriendlyMsg));
        }
    }

    @GetMapping
    public ResponseEntity<?> getStudentBehaviorLogs(
            @PathVariable String schemaName,
            @PathVariable Long classroomId, // Not directly used in this query, but part of path
            @PathVariable Long studentId) {
        try {
            // Fetch logs for the specific student
            var logs = jdbcTemplate.queryForList(
                    "SELECT id, statement, operation_type, points, expected_score, evidence_type, evidence_url, created_at " +
                            "FROM " + schemaName + ".student_behavior " +
                            "WHERE student_id = ? ORDER BY created_at DESC",
                    studentId
            );
            return ResponseEntity.ok(logs);
        } catch (EmptyResultDataAccessException e) {
            // No logs found is not an error, just return empty list
            return ResponseEntity.ok(List.of());
        } catch (Exception e) {
            // Log the exception for debugging
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("message", "تعذر تحميل سجل السلوك"));
        }
    }

    // Request DTO
    public record SaveBehaviorRequest(
            String statement,
            String operationType, // "add" or "deduct"
            Integer points,
            Integer expectedScore,
            String evidenceType,
            String evidenceUrl
    ) {}
}
