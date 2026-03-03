import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';

export function useAuth() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [isE2E, setIsE2E] = useState(false);
  const [mockUser, setMockUser] = useState<{ id: string, email: string } | null>(null);

  useEffect(() => {
    // Check for E2E secret cookie
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    if (cookies['x-e2e-secret']) {
      setIsE2E(true);
      setMockUser({
        id: cookies['x-e2e-user-id'] || 'user_e2e_test',
        email: cookies['x-e2e-user-email'] || 'e2e@intellident.test'
      });
    }
  }, []);

  return useMemo(() => {
    if (isE2E) {
      return {
        isLoaded: true,
        isSignedIn: true,
        user: {
          id: mockUser?.id,
          firstName: mockUser?.email?.split('@')[0],
          primaryEmailAddress: { emailAddress: mockUser?.email }
        }
      };
    }

    return {
      isLoaded: clerkLoaded,
      isSignedIn: !!clerkUser,
      user: clerkUser
    };
  }, [isE2E, mockUser, clerkLoaded, clerkUser]);
}
