/**
 * User type definitions for the ContractShield demo application.
 *
 * CONTRACT v2: field is "id" (renamed from "userId" in v1)
 *
 * Migration applied: userId → id (Task 3 coordinated repair)
 */

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ApiError {
  message: string;
  status: number;
}
