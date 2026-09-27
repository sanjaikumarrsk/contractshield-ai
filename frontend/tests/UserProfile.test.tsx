import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfile from '../src/components/UserProfile';
import * as userApi from '../src/api/userApi';

/**
 * UserProfile component tests.
 *
 * Migration applied: mock data userId → id, added user-id assertion (Task 3 coordinated repair)
 *
 * The mock object now uses the contract v2 field name `id`.
 * A test assertion on `user-id` has been added to close the test gap
 * previously identified by ContractShield.
 *
 * NOTE: The React component prop `userId` passed to <UserProfile userId={101} />
 * is the component interface prop and is intentionally NOT renamed — it is not
 * the API contract field.
 */

vi.mock('../src/api/userApi');

const mockUser = {
  id: 101,
  name: 'RSK',
  email: 'rsk@example.com',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('UserProfile', () => {
  it('renders user id, name and email when user is loaded', async () => {
    vi.spyOn(userApi, 'fetchUser').mockResolvedValue(mockUser);

    render(<UserProfile userId={101} />);

    await waitFor(() => {
      expect(screen.getByTestId('user-id')).toHaveTextContent('101');
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('RSK');
    expect(screen.getByTestId('user-email')).toHaveTextContent('rsk@example.com');
  });

  it('displays loading state initially', () => {
    vi.spyOn(userApi, 'fetchUser').mockReturnValue(new Promise(() => {}));

    render(<UserProfile userId={101} />);

    expect(screen.getByText('Loading user...')).toBeInTheDocument();
  });

  it('displays error when fetch fails', async () => {
    vi.spyOn(userApi, 'fetchUser').mockRejectedValue(new Error('User with id 999 not found'));

    render(<UserProfile userId={999} />);

    await waitFor(() => {
      expect(screen.getByText(/User with id 999 not found/)).toBeInTheDocument();
    });
  });
});
