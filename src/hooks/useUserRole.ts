import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';

export function useUserRole() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const resolveRole = async () => {
      try {
        const tokenResult = await auth.currentUser?.getIdTokenResult(true);
        setIsAdmin(tokenResult?.claims?.admin === true);
      } catch (error) {
        console.error('Failed to resolve user role');
        setIsAdmin(false);
      } finally {
        setLoadingRole(false);
      }
    };

    resolveRole();
  }, []);

  return {
    isAdmin,
    loadingRole,
    roleLabel: isAdmin ? 'Administrator' : 'Regular User',
  };
}
