package com.mueen.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class HelloController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/hello")
    public String hello() {
        return "مرحباً بك في منصة حقول! التطبيق يعمل بشكل صحيح.";
    }

    @GetMapping("/health")
    public String health() {
        return "التطبيق يعمل بشكل طبيعي - " + java.time.LocalDateTime.now();
    }
}