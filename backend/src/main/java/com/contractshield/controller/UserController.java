package com.contractshield.controller;

import com.contractshield.dto.UserDTO;
import com.contractshield.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing the User API.
 *
 * CONTRACT v2: endpoint is /api/v2/users/{id}
 *
 * Migration applied: /api/v1/users/{id} → /api/v2/users/{id} (Task 3 coordinated repair)
 */
@RestController
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * v2 endpoint — migrated contract.
     * Returns id field per contract v2 schema.
     */
    @GetMapping("/api/v2/users/{id}")
    public ResponseEntity<UserDTO> getUserV2(@PathVariable Long id) {
        return userService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
