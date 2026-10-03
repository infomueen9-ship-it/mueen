package com.mueen.modules.platform.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/platform/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

 @PostMapping
public ResponseEntity<?> createTenant(@RequestBody TenantService.CreateTenantRequest request) {
    try {
        Tenant tenant = tenantService.createTenant(request);
        return ResponseEntity.ok(tenant);
    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(500).body(java.util.Map.of("message", e.getMessage()));
    }
}

    @GetMapping
    public ResponseEntity<List<Tenant>> getAllTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tenant> getTenantById(@PathVariable Long id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }
}
