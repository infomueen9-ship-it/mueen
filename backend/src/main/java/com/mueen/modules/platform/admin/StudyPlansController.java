package com.mueen.modules.platform.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/admin/study-plans")
public class StudyPlansController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/terms")
    public ResponseEntity<List<Map<String, Object>>> getTerms() {
        ensureTermsTable();
        List<Map<String, Object>> terms = jdbcTemplate.queryForList(
            "SELECT id, name FROM public.terms ORDER BY id"
        );
        return ResponseEntity.ok(terms);
    }

    @GetMapping("/levels")
    public ResponseEntity<List<Map<String, Object>>> getLevels() {
        ensureLevelsTable();
        List<Map<String, Object>> levels = jdbcTemplate.queryForList(
            "SELECT id, name FROM public.level ORDER BY id"
        );
        return ResponseEntity.ok(levels);
    }

    @GetMapping("/grades")
    public ResponseEntity<List<Map<String, Object>>> getGrades() {
        ensureGradesTable();
        List<Map<String, Object>> grades = jdbcTemplate.queryForList(
            "SELECT id, name, level_id FROM public.grade ORDER BY id"
        );
        return ResponseEntity.ok(grades);
    }

    private void ensureTermsTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.terms (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)");
        jdbcTemplate.execute("INSERT INTO public.terms (name) VALUES ('الفصل الدراسي الاول') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.terms (name) VALUES ('الفصل الدراسي الثاني') ON CONFLICT (name) DO NOTHING");
    }

    private void ensureLevelsTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.level (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE)");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('مرحلة الروضة') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('المرحلة الابتدائية') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('المرحلة المتوسطة') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('الثانوية العامة') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('التعليم المستمر') ON CONFLICT (name) DO NOTHING");
        jdbcTemplate.execute("INSERT INTO public.level (name) VALUES ('التربيه الخاصة') ON CONFLICT (name) DO NOTHING");
    }

    private void ensureGradesTable() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS public.grade (id BIGSERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, level_id BIGINT NOT NULL REFERENCES public.level(id) ON DELETE CASCADE)");

        jdbcTemplate.queryForList("SELECT id FROM public.level WHERE name = 'مرحلة الروضة' LIMIT 1").stream().findFirst().ifPresent(level -> {
            Long levelId = ((Number) level.get("id")).longValue();
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الاول', " + levelId + ") ON CONFLICT DO NOTHING");
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الثاني', " + levelId + ") ON CONFLICT DO NOTHING");
            jdbcTemplate.execute("INSERT INTO public.grade (name, level_id) VALUES ('المستوى الثالث', " + levelId + ") ON CONFLICT DO NOTHING");
        });
    }
}
