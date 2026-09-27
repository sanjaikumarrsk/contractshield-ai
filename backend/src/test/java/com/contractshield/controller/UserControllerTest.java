package com.contractshield.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for UserController.
 *
 * Migration applied: v1 → v2 endpoint, userId → id field (Task 3 coordinated repair)
 * These tests now verify the v2 endpoint and the renamed "id" field.
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getUserV2_shouldReturnUser() throws Exception {
        mockMvc.perform(get("/api/v2/users/101")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(101))
                .andExpect(jsonPath("$.name").value("RSK"))
                .andExpect(jsonPath("$.email").value("rsk@example.com"));
    }

    @Test
    void getUserV2_notFound_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/v2/users/9999")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
