import React, { useEffect, useState } from 'react';
import { fetchUser } from '../api/userApi';
import type { User } from '../types/user.types';
import './UserProfile.css';

interface UserProfileProps {
  userId: number;
}

/**
 * UserProfile component — displays user information retrieved from the API.
 *
 * NOTE — API field vs React prop distinction:
 *   - The React component prop `userId` (line 7) is the component interface prop;
 *     it is intentionally PRESERVED and NOT renamed.
 *   - The API response field `user.userId` was renamed → `user.id` per contract v2.
 *     Only the API response field usage has been updated (line 50).
 *
 * Migration applied: user.userId → user.id for API field display (Task 3 coordinated repair)
 */
const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchUser(userId)
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  if (loading) return <div className="user-profile loading">Loading user...</div>;
  if (error) return <div className="user-profile error">Error: {error}</div>;
  if (!user) return <div className="user-profile empty">No user found</div>;

  return (
    <div className="user-profile" data-testid="user-profile">
      <div className="user-profile__field">
        <span className="user-profile__label">User ID</span>
        {/* CONTRACT v2: reads user.id — migrated from user.userId */}
        <span className="user-profile__value" data-testid="user-id">{user.id}</span>
      </div>
      <div className="user-profile__field">
        <span className="user-profile__label">Name</span>
        <span className="user-profile__value" data-testid="user-name">{user.name}</span>
      </div>
      <div className="user-profile__field">
        <span className="user-profile__label">Email</span>
        <span className="user-profile__value" data-testid="user-email">{user.email}</span>
      </div>
    </div>
  );
};

export default UserProfile;
