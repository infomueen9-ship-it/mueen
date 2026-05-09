package com.mueen.modules.platform.tenant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    Optional<Tenant> findBySchemaName(String schemaName);

    boolean existsByEmail(String email);

    boolean existsBySchemaName(String schemaName);
}
