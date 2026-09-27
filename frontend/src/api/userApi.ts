import type { User } from '../types/user.types';

/**
 * API client for the User Management API.
 *
 * CONTRACT v2: calls /api/v2/users/{id}
 *
 * Migration applied: /api/v1/users → /api/v2/users (Task 3 coordinated repair)
 */

// Keep the auxiliary API consumer relative to the configured Vite base path so
// it never points at the domain root when the app is hosted in a repository.
const BASE_URL = `${import.meta.env.BASE_URL}api/v2/users`;

export async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`User with id ${id} not found`);
    }
    throw new Error(`Failed to fetch user: HTTP ${response.status}`);
  }
  return response.json() as Promise<User>;
}
