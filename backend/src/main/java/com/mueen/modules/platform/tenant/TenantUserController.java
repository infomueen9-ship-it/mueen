package com.mueen.modules.platform.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/platform/tenants/{schemaName}/users")
@RequiredArgsConstructor
public class TenantUserController {

    private final TenantRepository tenantRepository;
    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    @PostMapping
    public ResponseEntity<?> createUser(
            @PathVariable String schemaName,
            @RequestBody CreateUserRequest request) {

        tenantRepository.findBySchemaName(schemaName)
                .orElseThrow(() -> new RuntimeException("School not found"));

        jdbcTemplate.update(
            "INSERT INTO " + schemaName + ".users " +
            "(full_name, username, email, phone, password_hash, role, gender, is_active) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)",
            request.fullName(),
            request.username(),
            request.email(),
            request.phone(),
            passwordEncoder.encode(request.password()),
            request.role(),
            request.gender()
        );

        return ResponseEntity.ok(Map.of("message", "User created successfully"));
    }

    @GetMapping
    public ResponseEntity<?> getUsers(@PathVariable String schemaName) {
        tenantRepository.findBySchemaName(schemaName)
                .orElseThrow(() -> new RuntimeException("School not found"));

        var users = jdbcTemplate.queryForList(
            "SELECT id, full_name, username, email, phone, role, gender, is_active, created_at " +
            "FROM " + schemaName + ".users"
        );

        return ResponseEntity.ok(users);
    }

    public record CreateUserRequest(
            String fullName,
            String username,
            String email,
            String phone,
            String password,
            String role,
            String gender
    ) {}
}