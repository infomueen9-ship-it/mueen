
package com.mueen.modules.school.archived;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.sql.Date;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/school/{schemaName}/classrooms/{classroomId}/archived-plans")
@RequiredArgsConstructor
public class ArchivedControl {

    private final JdbcTemplate jdbcTemplate;

    /*
     * =========================================================
     * جلب الخطط المؤرشفة للفصل
     * =========================================================
     *
     * GET:
     * /api/school/{schemaName}/classrooms/{classroomId}/archived-plans
     */
    @GetMapping
    public ResponseEntity<?> getArchivedPlans(
            @PathVariable String schemaName,
            @PathVariable Long classroomId) {

        String sql =
                "SELECT " +
                "id, " +
                "classroom_id, " +
                "type, " +
                "plan_id, " +
                "lesson_topic, " +
                "week_number, " +
                "date_from, " +
                "date_to, " +
                "homework " +
                "FROM " + schemaName + ".classroom_plans " +
                "WHERE classroom_id = ? " +
                "ORDER BY date_from NULLS LAST, id";

        List<Map<String, Object>> rows =
                jdbcTemplate.queryForList(sql, classroomId);

        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> row : rows) {

            Map<String, Object> item =
                    new HashMap<>();

            item.put("id", row.get("id"));
            item.put(
                    "classroomId",
                    row.get("classroom_id")
            );

            item.put(
                    "type",
                    row.get("type")
            );

            item.put(
                    "planId",
                    row.get("plan_id")
            );

            item.put(
                    "lessonTopic",
                    row.get("lesson_topic")
            );

            item.put(
                    "weekNumber",
                    row.get("week_number")
            );

            item.put(
                    "startDate",
                    row.get("date_from")
            );

            item.put(
                    "endDate",
                    row.get("date_to")
            );

            item.put(
                    "homework",
                    row.get("homework")
            );

            result.add(item);
        }

        return ResponseEntity.ok(result);
    }


    /*
     * =========================================================
     * إضافة درس
     * =========================================================
     *
     * POST:
     * /api/school/{schemaName}/classrooms/{classroomId}/archived-plans
     *
     * Body:
     *
     * {
     *   "type": "lesson",
     *   "planId": 18,
     *   "weekNumber": 1,
     *   "startDate": "2026-08-16",
     *   "endDate": "2026-08-22"
     * }
     */
    @PostMapping
    public ResponseEntity<?> addArchivedPlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody Map<String, Object> body) {

        String type =
                body.get("type") != null
                        ? body.get("type").toString()
                        : "lesson";

        if (!type.equals("lesson")
                && !type.equals("leave")) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "نوع السجل غير صحيح"
                    )
            );
        }

        /*
         * =====================================================
         * الإجازة
         * =====================================================
         */
        if (type.equals("leave")) {

            String lessonTopic =
                    body.get("lessonTopic") != null
                            ? body.get("lessonTopic").toString()
                            : null;

            if (lessonTopic == null
                    || lessonTopic.isBlank()) {

                return ResponseEntity.badRequest().body(
                        Map.of(
                                "message",
                                "يرجى إدخال اسم أو وصف الإجازة"
                        )
                );
            }

            Integer weekNumber =
                    getInteger(
                            body.get("weekNumber")
                    );

            Date startDate =
                    getDate(
                            body.get("startDate")
                    );

            Date endDate =
                    getDate(
                            body.get("endDate")
                    );

            jdbcTemplate.update(
                    "INSERT INTO " +
                    schemaName +
                    ".classroom_plans " +
                    "(classroom_id, type, plan_id, lesson_topic, week_number, date_from, date_to) " +
                    "VALUES (?, 'leave', NULL, ?, ?, ?, ?)",
                    classroomId,
                    lessonTopic,
                    weekNumber,
                    startDate,
                    endDate
            );

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "تمت إضافة الإجازة بنجاح"
                    )
            );
        }


        /*
         * =====================================================
         * الدرس
         * =====================================================
         */

        Long planId =
                getLong(
                        body.get("planId")
                );

        if (planId == null) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "يرجى اختيار موضوع الدرس"
                    )
            );
        }

        Integer weekNumber =
                getInteger(
                        body.get("weekNumber")
                );

        Date startDate =
                getDate(
                        body.get("startDate")
                );

        Date endDate =
                getDate(
                        body.get("endDate")
                );

        jdbcTemplate.update(
                "INSERT INTO " +
                schemaName +
                ".classroom_plans " +
                "(classroom_id, type, plan_id, lesson_topic, week_number, date_from, date_to) " +
                "VALUES (?, 'lesson', ?, NULL, ?, ?, ?)",
                classroomId,
                planId,
                weekNumber,
                startDate,
                endDate
        );

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "تمت إضافة الدرس بنجاح"
                )
        );
    }


    /*
     * =========================================================
     * إضافة عدة دروس دفعة واحدة
     * =========================================================
     *
     * هذا Endpoint متوافق مع إرسال:
     *
     * {
     *   "plans": [
     *      {
     *        "type": "lesson",
     *        "planId": 18,
     *        "weekNumber": 1,
     *        "startDate": "2026-08-16",
     *        "endDate": "2026-08-22"
     *      }
     *   ]
     * }
     */
    @PostMapping("/bulk")
    public ResponseEntity<?> addBulkArchivedPlans(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @RequestBody Map<String, Object> body) {

        Object plansObject =
                body.get("plans");

        if (!(plansObject instanceof List<?> plans)) {

            return ResponseEntity.badRequest().body(
                    Map.of(
                            "message",
                            "قائمة الخطط غير صحيحة"
                    )
            );
        }

        int inserted = 0;

        for (Object object : plans) {

            if (!(object instanceof Map<?, ?> raw)) {
                continue;
            }

            Map<String, Object> plan =
                    new HashMap<>();

            raw.forEach(
                    (key, value) ->
                            plan.put(
                                    String.valueOf(key),
                                    value
                            )
            );

            String type =
                    getString(
                            plan.get("type")
                    );

            if (type == null
                    || type.isBlank()) {

                type = "lesson";
            }

            Integer weekNumber =
                    getInteger(
                            plan.get("weekNumber")
                    );

            Date startDate =
                    getDate(
                            plan.get("startDate")
                    );

            Date endDate =
                    getDate(
                            plan.get("endDate")
                    );


            /*
             * درس
             */
            if (type.equals("lesson")) {

                Long planId =
                        getLong(
                                plan.get("planId")
                        );

                if (planId == null) {
                    continue;
                }

                jdbcTemplate.update(
                        "INSERT INTO " +
                        schemaName +
                        ".classroom_plans " +
                        "(classroom_id, type, plan_id, lesson_topic, week_number, date_from, date_to) " +
                        "VALUES (?, 'lesson', ?, NULL, ?, ?, ?)",
                        classroomId,
                        planId,
                        weekNumber,
                        startDate,
                        endDate
                );

                inserted++;
            }


            /*
             * إجازة
             */
            else if (type.equals("leave")) {

                String lessonTopic =
                        getString(
                                plan.get("lessonTopic")
                        );

                if (lessonTopic == null
                        || lessonTopic.isBlank()) {
                    continue;
                }

                jdbcTemplate.update(
                        "INSERT INTO " +
                        schemaName +
                        ".classroom_plans " +
                        "(classroom_id, type, plan_id, lesson_topic, week_number, date_from, date_to) " +
                        "VALUES (?, 'leave', NULL, ?, ?, ?, ?)",
                        classroomId,
                        lessonTopic,
                        weekNumber,
                        startDate,
                        endDate
                );

                inserted++;
            }
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "تم حفظ السجلات بنجاح",
                        "count",
                        inserted
                )
        );
    }


    /*
     * =========================================================
     * حذف سجل
     * =========================================================
     *
     * DELETE:
     * /api/school/{schemaName}/classrooms/{classroomId}/archived-plans/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteArchivedPlan(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long id) {

        int deleted =
                jdbcTemplate.update(
                        "DELETE FROM " +
                        schemaName +
                        ".classroom_plans " +
                        "WHERE id = ? " +
                        "AND classroom_id = ?",
                        id,
                        classroomId
                );

        if (deleted == 0) {

            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "تم حذف السجل بنجاح"
                )
        );
    }


    /*
     * =========================================================
     * تعديل الواجب (خاص بالمعلم)
     * =========================================================
     *
     * PUT:
     * /api/school/{schemaName}/classrooms/{classroomId}/archived-plans/{id}/homework
     *
     * Body:
     *
     * {
     *   "homework": "حل ص20"
     * }
     */
    @PutMapping("/{id}/homework")
    public ResponseEntity<?> updateHomework(
            @PathVariable String schemaName,
            @PathVariable Long classroomId,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {

        String homework =
                getString(
                        body.get("homework")
                );

        int updated =
                jdbcTemplate.update(
                        "UPDATE " +
                        schemaName +
                        ".classroom_plans " +
                        "SET homework = ? " +
                        "WHERE id = ? " +
                        "AND classroom_id = ?",
                        homework,
                        id,
                        classroomId
                );

        if (updated == 0) {

            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "تم تحديث الواجب بنجاح"
                )
        );
    }


    /*
     * =========================================================
     * أدوات مساعدة
     * =========================================================
     */

    private String getString(Object value) {

        if (value == null) {
            return null;
        }

        String result =
                value.toString().trim();

        return result.isEmpty()
                ? null
                : result;
    }


    private Long getLong(Object value) {

        if (value == null) {
            return null;
        }

        try {

            if (value instanceof Number number) {
                return number.longValue();
            }

            return Long.parseLong(
                    value.toString()
            );

        } catch (Exception e) {

            return null;
        }
    }


    private Integer getInteger(Object value) {

        if (value == null) {
            return null;
        }

        try {

            if (value instanceof Number number) {
                return number.intValue();
            }

            return Integer.parseInt(
                    value.toString()
            );

        } catch (Exception e) {

            return null;
        }
    }


    private Date getDate(Object value) {

        String text =
                getString(value);

        if (text == null) {
            return null;
        }

        try {

            return Date.valueOf(text);

        } catch (Exception e) {

            return null;
        }
    }
}

