import { useAuth, UserPermissions } from '@/context/AuthContext';

/**
 * Custom hook for checking user permissions
 */
export const usePermissions = () => {
    const { currentUser, hasPermission, isAdmin } = useAuth();

    const can = (permission: keyof UserPermissions): boolean => {
        return hasPermission(permission);
    };

    const canAny = (permissions: (keyof UserPermissions)[]): boolean => {
        return permissions.some(permission => hasPermission(permission));
    };

    const canAll = (permissions: (keyof UserPermissions)[]): boolean => {
        return permissions.every(permission => hasPermission(permission));
    };

    return {
        can,
        canAny,
        canAll,
        isAdmin: isAdmin(),
        currentUser,
    };
};
