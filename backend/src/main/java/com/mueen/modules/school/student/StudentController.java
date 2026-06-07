package com.mueen.modules.school.student;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Objects;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/students")
@RequiredArgsConstructor
public class StudentController {

    private final JdbcTemplate jdbcTemplate;

    // Record for student form data
    public record StudentForm(String fullName, String guardianPhone) {}

    @GetMapping
    public ResponseEntity<?> getStudents(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        ensureStudentSchema(schemaName); // تم تفعيل استدعاء الدالة لضمان إنشاء الجداول. في بيئة الإنتاج، يجب استدعاؤها مرة واحدة عند بدء تشغيل التطبيق أو إنشاء مستأجر جديد.

        // Query students from 'students' table and join with 'student_enrollments'
        // Also fetch the latest behavior score
        var students = jdbcTemplate.queryForList(
            "SELECT s.id, s.full_name, s.guardian_phone, " +
            "(SELECT expected_score FROM " + schemaName + ".student_behavior sb WHERE sb.student_id = s.id ORDER BY sb.created_at DESC LIMIT 1) as current_score " +
            "FROM " + schemaName + ".students s " +
            "JOIN " + schemaName + ".student_enrollments se ON s.id = se.student_id " +
            "WHERE se.classroom_id = ? ORDER BY s.id",
            classroomId
        );

        var result = students.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", row.get("id"));
            map.put("fullName", row.get("full_name"));
            map.put("guardianPhone", row.get("guardian_phone") != null ? row.get("guardian_phone") : "");
            Object score = row.get("current_score");
            map.put("expected_score", score != null ? score : 80);
            map.put("behavior_score", score != null ? score : 80);
            return map;
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/batch")
    @Transactional
    public ResponseEntity<?> addStudents(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody List<StudentForm> students) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        ensureStudentSchema(schemaName);

        for (var student : students) {
            String phone = (student.guardianPhone() == null || student.guardianPhone().isBlank()) 
                ? null : student.guardianPhone().trim();
            
            // 1. التحقق من تكرار رقم الجوال في جدول الطلاب العام
            if (phone != null) {
                var existing = jdbcTemplate.queryForList(
                    "SELECT id FROM " + schemaName + ".students WHERE guardian_phone = ?",
                    phone
                );
                if (!existing.isEmpty()) {
                    return ResponseEntity.badRequest().body(
                        Map.of("message", "رقم الجوال " + phone + " مسجل مسبقاً لطالب آخر")
                    );
                }
            }

            // 2. إدخال الطالب في جدول الطلاب وجلب المعرف الجديد
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO " + schemaName + ".students (full_name, guardian_phone) VALUES (?, ?)",
                    new String[]{"id"}
                );
                ps.setString(1, student.fullName());
                ps.setString(2, phone);
                return ps;
            }, keyHolder);

            Long studentId = Objects.requireNonNull(keyHolder.getKey()).longValue();

            // 3. ربط الطالب بالفصل الدراسي (Enrollment)
            jdbcTemplate.update(
                "INSERT INTO " + schemaName + ".student_enrollments (student_id, classroom_id) VALUES (?, ?)",
                studentId, classroomId
            );
        }
        return ResponseEntity.ok(Map.of("message", "تم إضافة الطلاب بنجاح"));
    }

    @PostMapping(value = "/batch-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> batchAddStudentsFromExcel(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestParam("file") MultipartFile file) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        ensureStudentSchema(schemaName);

        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("message", "الملف فارغ"));

        // التحقق من امتداد الملف قبل البدء بالمعالجة
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null || (!originalFileName.toLowerCase().endsWith(".xlsx") && !originalFileName.toLowerCase().endsWith(".xls"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "يرجى رفع ملف Excel صالح بصيغة (xlsx أو xls)"));
        }

        List<StudentForm> students = new ArrayList<>();
        try (InputStream is = new BufferedInputStream(file.getInputStream());
             Workbook workbook = WorkbookFactory.create(is)) {
            
            DataFormatter dataFormatter = new DataFormatter();
            // إضافة Evaluator لمعالجة الخلايا التي تحتوي على معادلات
            FormulaEvaluator evaluator = workbook.getCreationHelper().createFormulaEvaluator();
            Sheet sheet = workbook.getSheetAt(0);
            
            if (sheet == null || sheet.getPhysicalNumberOfRows() <= 1) {
                return ResponseEntity.badRequest().body(Map.of("message", "الملف لا يحتوي على بيانات طلاب (تأكد من وجود البيانات بدءاً من الصف الثاني)"));
            }

            // البدء من الصف الثاني (تجاهل صف العناوين)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || row.getPhysicalNumberOfCells() == 0) continue;

                String name = getCellValue(row.getCell(0), dataFormatter, evaluator);
                String rawPhone = getCellValue(row.getCell(1), dataFormatter, evaluator);
                
                String formattedPhone = null;
                if (rawPhone != null && !rawPhone.isBlank()) {
                    formattedPhone = rawPhone.trim().replace(" ", "");
                    // معالجة حالة قيام Excel بحذف الصفر في البداية (مثلاً 505... بدلاً من 0505...)
                    if (formattedPhone.length() == 9 && formattedPhone.startsWith("5")) {
                        formattedPhone = "0" + formattedPhone;
                    }
                }

                if (name != null && !name.isBlank()) {
                    students.add(new StudentForm(name.trim(), formattedPhone));
                }
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "خطأ أثناء معالجة ملف Excel: " + e.getMessage()));
        }

        if (students.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "لم يتم العثور على أي بيانات طلاب صالحة في الملف"));
        }

        // Validate duplicate guardian phone numbers within the uploaded file
        var seenPhones = new java.util.HashSet<String>();
        for (StudentForm student : students) {
            String phone = student.guardianPhone();
            if (phone != null && !phone.isBlank()) {
                if (!seenPhones.add(phone)) {
                    return ResponseEntity.badRequest().body(
                            Map.of("message", "رقم الجوال " + phone + " مكرر في ملف Excel. يرجى إزالة التكرارات وإعادة المحاولة."));
                }
            }
        }

        return addStudents(schemaName, classroomId, students);
    }

    private String getCellValue(Cell cell, DataFormatter dataFormatter, FormulaEvaluator evaluator) {
        if (cell == null) return null;
        return dataFormatter.formatCellValue(cell, evaluator);
    }

    @DeleteMapping("/{studentId}")
    @Transactional
    public ResponseEntity<?> deleteStudent(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long studentId) {

        if (!schemaName.matches("^[a-zA-Z0-9_]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid schema name"));
        }

        // حذف الارتباط بالفصل أولاً
        jdbcTemplate.update(
            "DELETE FROM " + schemaName + ".student_enrollments WHERE student_id = ? AND classroom_id = ?",
            studentId, classroomId
        );

        // تحقق إذا كان الطالب مسجلاً في فصول أخرى، إذا لم يكن، احذفه نهائياً مع سجلاته
        Integer otherClasses = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM " + schemaName + ".student_enrollments WHERE student_id = ?",
            Integer.class, studentId
        );

        if (otherClasses == null || otherClasses == 0) {
            jdbcTemplate.update("DELETE FROM " + schemaName + ".student_behavior WHERE student_id = ?", studentId);
            jdbcTemplate.update("DELETE FROM " + schemaName + ".students WHERE id = ?", studentId);
        }

        return ResponseEntity.ok(Map.of("message", "تم حذف الطالب بنجاح"));
    }

    private void ensureStudentSchema(String schemaName) {
        try {
            // إنشاء جدول الطلاب
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".students (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "full_name VARCHAR(255) NOT NULL, " +
                    "guardian_phone VARCHAR(20) UNIQUE, " +
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

            // إنشاء جدول الربط بالفصول
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".student_enrollments (" +
                    "student_id BIGINT REFERENCES " + schemaName + ".students(id) ON DELETE CASCADE, " +
                    "classroom_id BIGINT REFERENCES " + schemaName + ".classrooms(id) ON DELETE CASCADE, " +
                    "PRIMARY KEY (student_id, classroom_id))");

            // التأكد من وجود جدول سجل السلوك
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + schemaName + ".student_behavior (" +
                    "id BIGSERIAL PRIMARY KEY, " +
                    "student_id BIGINT NOT NULL, " +
                    "statement TEXT NOT NULL, " +
                    "operation_type VARCHAR(10) NOT NULL, " +
                    "points INT NOT NULL, " +
                    "expected_score INT NOT NULL DEFAULT 80, " +
                    "evidence_type VARCHAR(20), " +
                    "evidence_url TEXT, " +
                    "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
                    "FOREIGN KEY (student_id) REFERENCES " + schemaName + ".students(id) ON DELETE CASCADE)");
        } catch (Exception e) {
            // تجاهل أخطاء الـ DDL البسيطة لضمان استمرار عمل الـ API
        }
    }
}
