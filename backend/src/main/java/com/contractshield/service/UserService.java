package com.contractshield.service;

import com.contractshield.dto.UserDTO;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * In-memory user service — no database required.
 * Intentionally simple to keep the demo focused on contract migration.
 */
@Service
public class UserService {

    private static final Map<Long, UserDTO> USERS = new HashMap<>();

    static {
        USERS.put(101L, new UserDTO(101L, "RSK", "rsk@example.com"));
        USERS.put(102L, new UserDTO(102L, "Alice Johnson", "alice@example.com"));
        USERS.put(103L, new UserDTO(103L, "Bob Williams", "bob@example.com"));
    }

    public Optional<UserDTO> findById(Long id) {
        return Optional.ofNullable(USERS.get(id));
    }
}
