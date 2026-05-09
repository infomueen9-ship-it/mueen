package com.mueen.modules.platform.auth;

import com.mueen.config.JwtService;
import com.mueen.modules.platform.admin.PlatformAdmin;
import com.mueen.modules.platform.admin.PlatformAdminRepository;
import com.mueen.modules.platform.tenant.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final PlatformAdminRepository adminRepository;
    private final TenantRepository tenantRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    // ── Super Admin Login ─────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.email(), request.password()));

        PlatformAdmin admin = adminRepository.findByEmail(request.email())
                .orElseThrow();

        String token = jwtService.generateToken(
            admin.getEmail(),
            Map.of(
                "role", admin.getRole().name(),
                "name", admin.getFullName(),
                "type", "PLATFORM"
            )
        );

        return ResponseEntity.ok(Map.of(
            "id", admin.getId(),
            "token", token,
            "name", admin.getFullName(),
            "role", admin.getRole().name(),
            "type", "PLATFORM"
        ));
    }

    // ── School User Login ─────────────────────
    @PostMapping("/school/{schoolCode}/login")
public ResponseEntity<?> schoolLogin(
        @PathVariable String schoolCode,
        @RequestBody SchoolLoginRequest request) {

    String schemaName = "school_" + schoolCode.toLowerCase()
            .replaceAll("[^a-z0-9]", "_");

    var tenant = tenantRepository.findBySchemaName(schemaName)
            .orElseThrow(() -> new RuntimeException("School not found"));

    // ابحث أولاً في جدول users
    var users = jdbcTemplate.queryForList(
        "SELECT * FROM " + schemaName + ".users WHERE username = ? AND is_active = TRUE",
        request.username()
    );

    if (!users.isEmpty()) {
        var user = users.get(0);
        if (!passwordEncoder.matches(request.password(), (String) user.get("password_hash"))) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
        String token = jwtService.generateToken(
            (String) user.get("email") != null ? (String) user.get("email") : request.username(),
            Map.of(
                "role",       user.get("role"),
                "name",       user.get("full_name"),
                "username",   user.get("username"),
                "type",       "SCHOOL",
                "schemaName", schemaName,
                "tenantId",   tenant.getId()
            )
        );
        return ResponseEntity.ok(Map.of(
            "token",      token,
            "name",       user.get("full_name"),
            "username",   user.get("username"),
            "role",       user.get("role"),
            "type",       "SCHOOL",
            "schemaName", schemaName
        ));
    }

    // ابحث في جدول teachers
// ابحث في جدول teachers
var teachers = jdbcTemplate.queryForList(
    "SELECT * FROM " + schemaName + ".teachers WHERE username = ?",
    request.username()
);

if (!teachers.isEmpty()) {
    var teacher = teachers.get(0);
    if (!passwordEncoder.matches(request.password(), (String) teacher.get("password_hash"))) {
        return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
    }
    String token = jwtService.generateToken(
        request.username(),
        Map.of(
            "role",       "TEACHER",
            "name",       teacher.get("full_name"),
            "username",   teacher.get("username"),
            "type",       "SCHOOL",
            "schemaName", schemaName,
            "tenantId",   tenant.getId(),
            "teacherId",  teacher.get("id")
        )
    );
    return ResponseEntity.ok(Map.of(
        "token",      token,
        "name",       teacher.get("full_name"),
        "username",   teacher.get("username"),
        "role",       "TEACHER",
        "type",       "SCHOOL",
        "schemaName", schemaName,
        "teacherId",  teacher.get("id")
    ));
}

    return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
}

    // ── Setup ─────────────────────────────────
    @PostMapping("/setup")
    public ResponseEntity<?> setup(@RequestBody LoginRequest request) {
        if (adminRepository.count() > 0) {
            return ResponseEntity.badRequest().body("Already setup");
        }

        PlatformAdmin admin = PlatformAdmin.builder()
            .fullName("Super Admin")
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(PlatformAdmin.AdminRole.SUPER_ADMIN)
            .isActive(true)
            .build();

        adminRepository.save(admin);
        return ResponseEntity.ok(Map.of("message", "Admin created successfully"));
    }

    public record LoginRequest(String email, String password) {}
    public record SchoolLoginRequest(String username, String password) {}
}