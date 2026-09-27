package com.contractshield.dto;

/**
 * Data Transfer Object for User API responses.
 *
 * CONTRACT v2: field is "id" (renamed from "userId" in v1)
 *
 * ContractShield tracks this DTO as a DIRECTLY AFFECTED artifact.
 * Migration applied: userId → id (Task 3 coordinated repair)
 */
public class UserDTO {

    private Long id;
    private String name;
    private String email;

    public UserDTO() {}

    public UserDTO(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
