package com.mueen.modules.platform.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlatformAdminDetailsService implements UserDetailsService {

    private final PlatformAdminRepository repository;

    @Override
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        PlatformAdmin admin = repository.findByEmail(email)
                .orElseThrow(() ->
                    new UsernameNotFoundException("Admin not found: " + email));

        return new User(
                admin.getEmail(),
                admin.getPasswordHash(),
                List.of(new SimpleGrantedAuthority(admin.getRole().name()))
        );
    }
}
