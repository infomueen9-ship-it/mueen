package com.mueen.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HelloController {

    @GetMapping("/hello")
    public String hello() {
        return "مرحباً بك في منصة معين! التطبيق يعمل بشكل صحيح.";
    }

    @GetMapping("/health")
    public String health() {
        return "التطبيق يعمل بشكل طبيعي - " + java.time.LocalDateTime.now();
    }
}