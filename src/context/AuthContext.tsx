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
    password?: string;
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
                // 1. Check for stored active user session
                try {
                    const storedUser = localStorage.getItem('pos_active_user');
                    if (storedUser) {
                        const parsedUser: User = JSON.parse(storedUser);
                        if (parsedUser && parsedUser.isActive) {
                            setCurrentUser(parsedUser);
                        }
                    }
                } catch (e) {}

                // 2. Check for Supabase session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const userData = await fetchUserData(session.user.id);
                    if (userData && userData.isActive) {
                        setCurrentUser(userData);
                        localStorage.setItem('pos_active_user', JSON.stringify(userData));
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
                                    localStorage.setItem('pos_active_user', JSON.stringify(userData));
                                }
                            } catch (err) {
                                console.error('Error handling SIGNED_IN auth state change:', err);
                            }
                        }, 0);
                    } else if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                        localStorage.removeItem('pos_active_user');
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

    // Fetch all users from database & settings
    const fetchAllUsers = async (): Promise<User[]> => {
        try {
            // 1. Load deleted user IDs from localStorage
            let deletedIds: string[] = [];
            try {
                const storedDeleted = localStorage.getItem('pos_deleted_user_ids');
                if (storedDeleted) deletedIds = JSON.parse(storedDeleted);
            } catch (e) {}

            // 2. Fetch from settings table (app_users) - Cloud sync for all devices
            let settingsUsers: User[] = [];
            try {
                const { data: settingsRow, error } = await supabase
                    .from('settings')
                    .select('id, category, settings')
                    .eq('category', 'app_users')
                    .maybeSingle();

                if (!error && settingsRow?.settings) {
                    const raw = settingsRow.settings as any;
                    if (Array.isArray(raw)) {
                        settingsUsers = raw;
                    } else if (raw.users && Array.isArray(raw.users)) {
                        settingsUsers = raw.users;
                    }
                }
            } catch (err) {
                console.warn('Note on settings app_users fetch:', err);
            }

            // 3. Fetch from public.users table if accessible
            let dbUsers: User[] = [];
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    dbUsers = data.map(user => ({
                        id: user.id,
                        username: user.username,
                        name_en: user.name_en || '',
                        name_dv: user.name_dv || '',
                        role: user.role,
                        permissions: user.permissions,
                        isActive: user.is_active !== undefined ? user.is_active : true,
                        createdAt: user.created_at,
                        lastLogin: user.last_login,
                    }));
                }
            } catch (err) {
                console.warn('Note on public.users fetch:', err);
            }

            // 4. Fetch from localStorage backup
            let localUsers: User[] = [];
            try {
                const stored = localStorage.getItem('pos_system_users');
                if (stored) localUsers = JSON.parse(stored);
            } catch (e) {}

            // 5. Merge all sources, deduplicate by ID/username, and filter out deleted IDs
            const userMap = new Map<string, User>();
            [...dbUsers, ...settingsUsers, ...localUsers].forEach(u => {
                if (u && u.id && !deletedIds.includes(u.id)) {
                    const existing = userMap.get(u.id);
                    userMap.set(u.id, {
                        ...u,
                        password: u.password || existing?.password || ''
                    });
                }
            });

            const mergedUsers = Array.from(userMap.values());
            setUsers(mergedUsers);
            localStorage.setItem('pos_system_users', JSON.stringify(mergedUsers));
            return mergedUsers;
        } catch (error) {
            console.error('Error in fetchAllUsers:', error);
            return [];
        }
    };

    const getAuthEmail = (username: string) => {
        const clean = username.trim();
        if (clean.includes('@')) return clean;
        const normalized = clean.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
        return `${normalized}@posmv.com`;
    };

    const getSecurePassword = (password: string) => {
        const clean = password.trim();
        return clean.length >= 6 ? clean : (clean + '000000').slice(0, 6);
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const cleanUsername = username.trim();
            const cleanPassword = password.trim();
            const email = getAuthEmail(cleanUsername);
            const securePass = getSecurePassword(cleanPassword);

            // 1. Fetch latest user list from Supabase cloud (settings / users)
            const currentUsersList = await fetchAllUsers();

            // 2. Match user from cloud sync
            const matchedUser = currentUsersList.find(u => 
                u.username.toLowerCase() === cleanUsername.toLowerCase() && (u.isActive !== false)
            );

            if (matchedUser) {
                // If user has stored password, check it
                if (matchedUser.password) {
                    const storedPass = matchedUser.password.trim();
                    if (storedPass !== cleanPassword && storedPass !== securePass) {
                        console.warn('Password mismatch for user:', cleanUsername);
                        return false;
                    }
                }

                const activeUser: User = {
                    ...matchedUser,
                    lastLogin: new Date().toISOString()
                };

                setCurrentUser(activeUser);
                localStorage.setItem('pos_active_user', JSON.stringify(activeUser));

                // Background Supabase Auth sign in attempt (fire-and-forget)
                try {
                    supabase.auth.signInWithPassword({
                        email,
                        password: securePass,
                    }).catch(() => {});
                } catch (e) {}

                return true;
            }

            // 3. Fallback: Try Supabase Auth direct login
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password: securePass,
                });
                if (!error && data.user) {
                    const userData = await fetchUserData(data.user.id);
                    if (userData && userData.isActive) {
                        setCurrentUser(userData);
                        localStorage.setItem('pos_active_user', JSON.stringify(userData));
                        await fetchAllUsers();
                        return true;
                    }
                }
            } catch (authErr) {
                console.warn('Supabase auth login note:', authErr);
            }

            // 4. Default admin fallback
            if (cleanUsername.toLowerCase() === 'admin' && (cleanPassword === 'admin' || cleanPassword === 'admin123')) {
                const defaultAdmin: User = {
                    id: 'admin-default',
                    username: 'admin',
                    name_en: 'Administrator',
                    name_dv: 'އެޑްމިނިސްޓްރޭޓަރ',
                    role: 'admin',
                    permissions: adminPermissions,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                setCurrentUser(defaultAdmin);
                localStorage.setItem('pos_active_user', JSON.stringify(defaultAdmin));
                return true;
            }

            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut().catch(() => {});
            setCurrentUser(null);
            localStorage.removeItem('pos_active_user');
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
            const authUserId = crypto.randomUUID();
            const cleanUsername = userData.username.trim();
            const cleanPassword = userData.password.trim();
            const authEmail = getAuthEmail(cleanUsername);
            const securePass = getSecurePassword(cleanPassword);

            const newUser: User = {
                id: authUserId,
                username: cleanUsername,
                password: cleanPassword,
                name_en: userData.name_en || '',
                name_dv: userData.name_dv || '',
                role: userData.role,
                permissions: userData.permissions,
                isActive: userData.isActive !== undefined ? userData.isActive : true,
                createdAt: new Date().toISOString()
            };

            // 1. Update local state immediately
            const updatedUsers = [newUser, ...users.filter(u => u.id !== authUserId && u.username.toLowerCase() !== cleanUsername.toLowerCase())];
            setUsers(updatedUsers);
            localStorage.setItem('pos_system_users', JSON.stringify(updatedUsers));

            // 2. Save into Supabase settings table (Cloud-synchronized for all mobiles)
            try {
                const { data: existing } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('category', 'app_users')
                    .maybeSingle();

                const payload = {
                    category: 'app_users',
                    settings: { users: updatedUsers },
                    updated_at: new Date().toISOString()
                };

                if (existing?.id) {
                    await supabase.from('settings').update(payload).eq('id', existing.id);
                } else {
                    await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
                }
            } catch (settingsErr) {
                console.warn('Note saving users to Supabase settings:', settingsErr);
            }

            // 3. Register user in Supabase Auth backend
            if (supabaseUrl && supabaseAnonKey && cleanPassword) {
                try {
                    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    });

                    await tempClient.auth.signUp({
                        email: authEmail,
                        password: securePass,
                        options: {
                            data: {
                                name_en: userData.name_en,
                                name_dv: userData.name_dv,
                                role: userData.role,
                                permissions: userData.permissions,
                            }
                        }
                    });
                } catch (signUpErr) {
                    console.warn('Supabase Auth signUp note:', signUpErr);
                }
            }

            // 4. Try upserting into public.users table (catching RLS error gracefully)
            try {
                await supabase
                    .from('users')
                    .upsert({
                        id: authUserId,
                        username: cleanUsername,
                        name_en: userData.name_en,
                        name_dv: userData.name_dv,
                        role: userData.role,
                        permissions: userData.permissions,
                        is_active: userData.isActive !== undefined ? userData.isActive : true,
                        created_at: new Date().toISOString()
                    });
            } catch (dbError) {
                console.warn('Direct users table insert note (stored via app_users):', dbError);
            }
        } catch (error) {
            console.error('Error adding user:', error);
            throw error;
        }
    };

    const updateUser = async (id: string, updates: Partial<User> & { password?: string }) => {
        try {
            const updatedUsers = users.map(u => {
                if (u.id === id) {
                    return {
                        ...u,
                        ...updates,
                        is_active: updates.isActive !== undefined ? updates.isActive : u.isActive
                    };
                }
                return u;
            });

            setUsers(updatedUsers);
            localStorage.setItem('pos_system_users', JSON.stringify(updatedUsers));

            // Save to settings table
            try {
                const { data: existing } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('category', 'app_users')
                    .maybeSingle();

                const payload = {
                    category: 'app_users',
                    settings: { users: updatedUsers },
                    updated_at: new Date().toISOString()
                };

                if (existing?.id) {
                    await supabase.from('settings').update(payload).eq('id', existing.id);
                } else {
                    await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
                }
            } catch (settingsErr) {
                console.warn('Note updating settings app_users:', settingsErr);
            }

            // Update in public.users table
            try {
                const updateData: any = {};
                if (updates.name_en !== undefined) updateData.name_en = updates.name_en;
                if (updates.name_dv !== undefined) updateData.name_dv = updates.name_dv;
                if (updates.role !== undefined) updateData.role = updates.role;
                if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
                if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

                await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', id);
            } catch (dbErr) {
                console.warn('Note updating public.users table:', dbErr);
            }

            // Update current user if it's the same user
            if (currentUser?.id === id) {
                const updatedUser = updatedUsers.find(u => u.id === id);
                if (updatedUser) {
                    setCurrentUser(updatedUser);
                    localStorage.setItem('pos_active_user', JSON.stringify(updatedUser));
                }
            }
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    };

    const deleteUser = async (id: string) => {
        try {
            // 1. Add ID to deleted user IDs list
            let deletedIds: string[] = [];
            try {
                const storedDeleted = localStorage.getItem('pos_deleted_user_ids');
                if (storedDeleted) deletedIds = JSON.parse(storedDeleted);
            } catch (e) {}

            if (!deletedIds.includes(id)) {
                deletedIds.push(id);
                localStorage.setItem('pos_deleted_user_ids', JSON.stringify(deletedIds));
            }

            // 2. Remove user from local state and localStorage
            const updatedUsers = users.filter(u => u.id !== id);
            setUsers(updatedUsers);
            localStorage.setItem('pos_system_users', JSON.stringify(updatedUsers));

            // 3. Save updated users into settings table
            try {
                const { data: existing } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('category', 'app_users')
                    .maybeSingle();

                const payload = {
                    category: 'app_users',
                    settings: { users: updatedUsers },
                    updated_at: new Date().toISOString()
                };

                if (existing?.id) {
                    await supabase.from('settings').update(payload).eq('id', existing.id);
                } else {
                    await supabase.from('settings').insert({ ...payload, id: crypto.randomUUID() });
                }
            } catch (settingsErr) {
                console.warn('Note updating settings on delete:', settingsErr);
            }

            // 4. Attempt to delete from public.users table directly
            try {
                await supabase
                    .from('users')
                    .delete()
                    .eq('id', id);
            } catch (dbError) {
                console.warn('Direct delete from users table note:', dbError);
            }
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
