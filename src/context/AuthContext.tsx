"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import SupabaseError from '@/components/SupabaseError';
import { showSuccess, showError } from '@/utils/toast';

// User Permissions Interface
export interface UserPermissions {
    // Navigation Access
    canAccessPOS: boolean;
    canAccessProducts: boolean;
    canAccessStock: boolean;
    canAccessCustomers: boolean;
    canAccessSales: boolean;
    canAccessReports: boolean;
    canAccessAdmin: boolean;

    // Feature Permissions
    canEditProducts: boolean;
    canDeleteProducts: boolean;
    canEditCustomers: boolean;
    canDeleteCustomers: boolean;
    canMakeSales: boolean;
    canMakeCreditSales: boolean;
    canEditSales: boolean;
    canDeleteSales: boolean;
    canViewReports: boolean;
    canExportData: boolean;
    canManageUsers: boolean;
    canEditSettings: boolean;
}

// User Interface
export interface User {
    id: string;
    username: string;
    name_en: string;
    name_dv: string;
    role: 'admin' | 'cashier';
    permissions: UserPermissions;
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
}

// Auth Context Type
interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasPermission: (permission: keyof UserPermissions) => boolean;
    isAdmin: () => boolean;
    users: User[];
    addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<void>;
    updateUser: (id: string, updates: Partial<User> & { password?: string }) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin permissions (all true)
const adminPermissions: UserPermissions = {
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessStock: true,
    canAccessCustomers: true,
    canAccessSales: true,
    canAccessReports: true,
    canAccessAdmin: true,
    canEditProducts: true,
    canDeleteProducts: true,
    canEditCustomers: true,
    canDeleteCustomers: true,
    canMakeSales: true,
    canMakeCreditSales: true,
    canEditSales: true,
    canDeleteSales: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: true,
    canEditSettings: true,
};

// Default cashier permissions (limited)
const cashierPermissions: UserPermissions = {
    canAccessPOS: true,
    canAccessProducts: true,
    canAccessStock: false,
    canAccessCustomers: true,
    canAccessSales: false,
    canAccessReports: false,
    canAccessAdmin: false,
    canEditProducts: false,
    canDeleteProducts: false,
    canEditCustomers: false,
    canDeleteCustomers: false,
    canMakeSales: true,
    canMakeCreditSales: false,
    canEditSales: false,
    canDeleteSales: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canEditSettings: false,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch user data from Supabase users table
    const fetchUserData = async (authUserId: string): Promise<User | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUserId)
                .single();

            if (error) {
                console.error('Error fetching user data:', error);
                return null;
            }

            return {
                id: data.id,
                username: data.username,
                name_en: data.name_en,
                name_dv: data.name_dv,
                role: data.role,
                permissions: data.permissions,
                isActive: data.is_active,
                createdAt: data.created_at,
                lastLogin: data.last_login,
            };
        } catch (error) {
            console.error('Error in fetchUserData:', error);
            return null;
        }
    };

    // Load auth state on mount
    useEffect(() => {
        let subscription: any = null;

        const initAuth = async () => {
            try {
                // Check for existing session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const userData = await fetchUserData(session.user.id);
                    if (userData && userData.isActive) {
                        setCurrentUser(userData);
                    } else if (userData && !userData.isActive) {
                        await supabase.auth.signOut();
                    }
                }

                // Listen for auth changes
                const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('Auth event:', event);
                    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
                        const userData = await fetchUserData(session.user.id);
                        if (userData && userData.isActive) {
                            setCurrentUser(userData);
                        } else if (userData && !userData.isActive) {
                            await supabase.auth.signOut();
                        }
                    } else if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                    }
                });

                subscription = sub;

                // Fetch all users for admin panel if admin
                await fetchAllUsers();
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, []);

    // Fetch all users from database
    const fetchAllUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching users:', error);
                return;
            }

            const formattedUsers: User[] = data.map(user => ({
                id: user.id,
                username: user.username,
                name_en: user.name_en,
                name_dv: user.name_dv,
                role: user.role,
                permissions: user.permissions,
                isActive: user.is_active,
                createdAt: user.created_at,
                lastLogin: user.last_login,
            }));

            setUsers(formattedUsers);
        } catch (error) {
            console.error('Error in fetchAllUsers:', error);
        }
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            // Sign in with Supabase Auth using email (username) and password
            const { data, error } = await supabase.auth.signInWithPassword({
                email: username,
                password: password,
            });

            if (error) {
                console.error('Login error:', error);
                return false;
            }

            if (!data.user) {
                return false;
            }

            // Fetch user data from users table
            const userData = await fetchUserData(data.user.id);

            if (!userData || !userData.isActive) {
                await supabase.auth.signOut();
                return false;
            }

            // Update last login
            await supabase
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.user.id);

            setCurrentUser(userData);
            await fetchAllUsers();

            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setCurrentUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const hasPermission = (permission: keyof UserPermissions): boolean => {
        if (!currentUser) return false;
        if (currentUser.role === 'admin') return true;
        return currentUser.permissions[permission];
    };

    const isAdmin = (): boolean => {
        return currentUser?.role === 'admin';
    };

    const addUser = async (userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
        try {
            // Ensure username is a valid email format for Supabase Auth
            const email = userData.username.includes('@')
                ? userData.username
                : `${userData.username}@hadiyapos.local`;

            // Create auth user using supabaseAdmin (Admin API)
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: userData.password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    name_en: userData.name_en,
                    name_dv: userData.name_dv,
                    role: userData.role,
                    permissions: userData.permissions,
                }
            });

            if (authError) {
                console.error('CRITICAL: Supabase Admin CreateUser error:', authError);
                showError(`Failed to create user: ${authError.message}`);
                throw authError;
            }

            console.log('User created in Auth successfully:', authData.user?.id);

            // The trigger in Supabase will automatically create the user in the users table
            await fetchAllUsers();
        } catch (error: any) {
            console.error('CRITICAL: Error in addUser function:', error);
            showError(error.message || 'System error while adding user');
            throw error;
        }
    };

    const updateUser = async (id: string, updates: Partial<User> & { password?: string }) => {
        try {
            // Update user in users table
            const updateData: any = {};
            if (updates.name_en) updateData.name_en = updates.name_en;
            if (updates.name_dv) updateData.name_dv = updates.name_dv;
            if (updates.role) updateData.role = updates.role;
            if (updates.permissions) updateData.permissions = updates.permissions;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id);

            if (error) {
                console.error('Error updating user:', error);
                throw error;
            }

            // Update password if provided
            if (updates.password) {
                const { error: passwordError } = await supabase.auth.admin.updateUserById(
                    id,
                    { password: updates.password }
                );

                if (passwordError) {
                    console.error('Error updating password:', passwordError);
                }
            }

            // Refresh users list
            await fetchAllUsers();

            // Update current user if it's the same user
            if (currentUser?.id === id) {
                const updatedUser = await fetchUserData(id);
                if (updatedUser) {
                    setCurrentUser(updatedUser);
                }
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    };

    const deleteUser = async (id: string) => {
        try {
            // Delete from auth.users using Admin client
            const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

            if (error) {
                console.error('Error deleting user:', error);
                throw error;
            }

            // Also delete from users table to be safe (though cascade should handle it)
            await supabase.from('users').delete().eq('id', id);

            await fetchAllUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    };

    const value: AuthContextType = {
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        hasPermission,
        isAdmin,
        users,
        addUser,
        updateUser,
        deleteUser,
        loading,
    };

    if (!isSupabaseConfigured) {
        return <SupabaseError />;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Export default permissions for convenience
export { adminPermissions, cashierPermissions };
