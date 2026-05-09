package com.mueen.config;

import com.mueen.modules.platform.admin.PlatformAdmin;
import com.mueen.modules.platform.admin.PlatformAdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminBootstrapConfig {

    @Bean
    public CommandLineRunner seedDefaultAdmin(
            PlatformAdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.enabled:false}") boolean enabled,
            @Value("${app.bootstrap.admin.email:admin@mueen.com}") String email,
            @Value("${app.bootstrap.admin.password:admin123}") String password,
            @Value("${app.bootstrap.admin.name:Super Admin}") String fullName) {
        return args -> {
            if (!enabled || adminRepository.count() > 0) {
                return;
            }

            PlatformAdmin admin = PlatformAdmin.builder()
                    .fullName(fullName)
                    .email(email)
                    .passwordHash(passwordEncoder.encode(password))
                    .role(PlatformAdmin.AdminRole.SUPER_ADMIN)
                    .isActive(true)
                    .build();

            adminRepository.save(admin);
            log.info("Seeded default platform admin account for {}", email);
        };
    }
}
