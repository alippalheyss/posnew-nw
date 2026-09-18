"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';

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

// Cache for deduplicating concurrent fetchUserData requests
const pendingUserRequests = new Map<string, Promise<User | null>>();

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
        if (pendingUserRequests.has(authUserId)) {
            return pendingUserRequests.get(authUserId)!;
        }

        const request = (async () => {
            try {
                let retries = 3;
                while (retries > 0) {
                    try {
                        const { data, error } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', authUserId)
                            .single();

                        if (error) {
                            if (error.message && error.message.includes('AbortError') && retries > 1) {
                                retries--;
                                await new Promise(res => setTimeout(res, 500));
                                continue;
                            }
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
                    } catch (error: any) {
                        if (error?.message?.includes('AbortError') && retries > 1) {
                            retries--;
                            await new Promise(res => setTimeout(res, 500));
                            continue;
                        }
                        console.error('Error in fetchUserData:', error);
                        return null;
                    }
                }
                return null;
            } finally {
                pendingUserRequests.delete(authUserId);
            }
        })();

        pendingUserRequests.set(authUserId, request);
        return request;
    };

    // Load auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check for existing session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const userData = await fetchUserData(session.user.id);
                    if (userData && userData.isActive) {
                        setCurrentUser(userData);
                    }
                }

                // Listen for auth changes
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                    if (event === 'SIGNED_IN' && session?.user) {
                        setTimeout(async () => {
                            try {
                                const userData = await fetchUserData(session.user.id);
                                if (userData && userData.isActive) {
                                    setCurrentUser(userData);
                                }
                            } catch (err) {
                                console.error('Error handling SIGNED_IN auth state change:', err);
                            }
                        }, 0);
                    } else if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                    }
                });

                // Fetch all users for admin panel
                await fetchAllUsers();

                return () => {
                    subscription.unsubscribe();
                };
            } catch (error) {
                console.error('Error initializing auth:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
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
            const email = username.includes('@') ? username.trim() : `${username.toLowerCase().trim()}@pos.local`;
            // Sign in with Supabase Auth using email (username) and password
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
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
                try {
                    await supabase.auth.signOut();
                } catch (signOutError) {
                    console.error('Error during forced signout:', signOutError);
                }
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
            let authUserId = crypto.randomUUID();

            // Try creating user in Supabase Auth using a temporary non-persistent client so current admin stays logged in
            if (supabaseUrl && supabaseAnonKey) {
                try {
                    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    });

                    const email = userData.username.includes('@') ? userData.username : `${userData.username.toLowerCase().trim()}@pos.local`;
                    const { data: authData, error: authError } = await tempClient.auth.signUp({
                        email,
                        password: userData.password,
                        options: {
                            data: {
                                name_en: userData.name_en,
                                name_dv: userData.name_dv,
                                role: userData.role,
                                permissions: userData.permissions,
                            }
                        }
                    });

                    if (authData?.user) {
                        authUserId = authData.user.id;
                    }
                } catch (signUpErr) {
                    console.warn('Auth signUp note (proceeding with users table creation):', signUpErr);
                }
            }

            // Always insert/upsert user into public.users table
            const { error: dbError } = await supabase
                .from('users')
                .upsert({
                    id: authUserId,
                    username: userData.username,
                    name_en: userData.name_en,
                    name_dv: userData.name_dv,
                    role: userData.role,
                    permissions: userData.permissions,
                    is_active: userData.isActive !== undefined ? userData.isActive : true,
                    created_at: new Date().toISOString()
                });

            if (dbError) {
                console.error('Error inserting user to database:', dbError);
                throw dbError;
            }

            await fetchAllUsers();
        } catch (error) {
            console.error('Error adding user:', error);
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
            // Optimistically remove user from state
            setUsers(prev => prev.filter(u => u.id !== id));

            // Delete from public.users table directly
            const { error: dbError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (dbError) {
                console.warn('Direct delete from users table failed, deactivating user instead:', dbError);
                await supabase
                    .from('users')
                    .update({ is_active: false })
                    .eq('id', id);
            }

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
