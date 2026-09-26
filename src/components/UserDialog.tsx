"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth, User, UserPermissions, adminPermissions, cashierPermissions } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showSuccess, showError } from '@/utils/toast';

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: User | null;
    onSave: () => void;
}

const UserDialog: React.FC<UserDialogProps> = ({ open, onOpenChange, user, onSave }) => {
    const { t } = useTranslation();
    const { addUser, updateUser } = useAuth();

    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: '',
        name_en: user?.name_en || '',
        name_dv: user?.name_dv || '',
        role: user?.role || 'cashier' as 'admin' | 'cashier',
        isActive: user?.isActive ?? true,
        permissions: user?.permissions || { ...cashierPermissions },
    });

    React.useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                password: '',
                name_en: user.name_en,
                name_dv: user.name_dv,
                role: user.role,
                isActive: user.isActive,
                permissions: user.permissions,
            });
        } else {
            setFormData({
                username: '',
                password: '',
                name_en: '',
                name_dv: '',
                role: 'cashier',
                isActive: true,
                permissions: { ...cashierPermissions },
            });
        }
    }, [user, open]);

    const handleRoleChange = (role: 'admin' | 'cashier') => {
        setFormData(prev => ({
            ...prev,
            role,
            permissions: role === 'admin' ? { ...adminPermissions } : { ...cashierPermissions },
        }));
    };

    const handlePermissionChange = (permission: keyof UserPermissions, value: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permission]: value,
            },
        }));
    };

    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (user) {
                // Update existing user
                const updates: Partial<User> = {
                    name_en: formData.name_en,
                    name_dv: formData.name_dv,
                    role: formData.role,
                    isActive: formData.isActive,
                    permissions: formData.permissions,
                };
                if (formData.password) {
                    updates.password = formData.password;
                }
                await updateUser(user.id, updates);
                showSuccess(t('user_updated') || 'User updated successfully');
            } else {
                // Add new user
                await addUser({
                    username: formData.username,
                    password: formData.password,
                    name_en: formData.name_en,
                    name_dv: formData.name_dv,
                    role: formData.role,
                    isActive: formData.isActive,
                    permissions: formData.permissions,
                });
                showSuccess(t('user_created') || 'User created successfully');
            }

            onSave();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Failed to save user:', err);
            showError(err?.message || 'Failed to save user. Please check database permissions.');
        } finally {
            setIsSaving(false);
        }
    };

    const permissionGroups = [
        {
            title: t('navigation_access'),
            permissions: [
                { key: 'canAccessPOS' as keyof UserPermissions, label: t('pos_title') },
                { key: 'canAccessProducts' as keyof UserPermissions, label: t('products') },
                { key: 'canAccessStock' as keyof UserPermissions, label: t('stock') },
                { key: 'canAccessCustomers' as keyof UserPermissions, label: t('customers') },
                { key: 'canAccessSales' as keyof UserPermissions, label: t('sales') },
                { key: 'canAccessReports' as keyof UserPermissions, label: t('reports') },
                { key: 'canAccessAdmin' as keyof UserPermissions, label: t('admin_settings') },
            ],
        },
        {
            title: t('feature_permissions'),
            permissions: [
                { key: 'canEditProducts' as keyof UserPermissions, label: t('edit_products') },
                { key: 'canDeleteProducts' as keyof UserPermissions, label: t('delete_products') },
                { key: 'canEditCustomers' as keyof UserPermissions, label: t('edit_customers') },
                { key: 'canDeleteCustomers' as keyof UserPermissions, label: t('delete_customers') },
                { key: 'canMakeSales' as keyof UserPermissions, label: t('make_sales') },
                { key: 'canMakeCreditSales' as keyof UserPermissions, label: t('make_credit_sales') },
                { key: 'canEditSales' as keyof UserPermissions, label: t('edit_sales') },
                { key: 'canDeleteSales' as keyof UserPermissions, label: t('delete_sales') },
                { key: 'canViewReports' as keyof UserPermissions, label: t('view_reports') },
                { key: 'canExportData' as keyof UserPermissions, label: t('export_data') },
                { key: 'canManageUsers' as keyof UserPermissions, label: t('manage_users') },
                { key: 'canEditSettings' as keyof UserPermissions, label: t('edit_settings') },
            ],
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
                <DialogHeader className="text-right pb-3 border-b border-white/10">
                    <DialogTitle className="text-xl font-black text-foreground">{user ? t('edit_user') : t('add_user')}</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground font-bold">
                        {user ? t('edit_user_description') : t('add_user_description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-2">
                    {/* Username */}
                    <div className="space-y-1.5 text-right">
                        <Label htmlFor="username" className="text-xs font-black uppercase text-foreground">{t('username')}</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            required
                            disabled={!!user}
                            className="text-right apple-glass-input h-11 rounded-2xl font-bold"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5 text-right">
                        <Label htmlFor="password" className="text-xs font-black uppercase text-foreground">
                            {t('password')} {user && `(${t('leave_blank_to_keep')})`}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            required={!user}
                            className="text-right apple-glass-input h-11 rounded-2xl font-mono"
                        />
                    </div>

                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-right">
                            <Label htmlFor="name_en" className="text-xs font-black uppercase text-foreground">{t('name_english')}</Label>
                            <Input
                                id="name_en"
                                value={formData.name_en}
                                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                                required
                                className="apple-glass-input h-11 rounded-2xl font-bold text-right"
                            />
                        </div>
                        <div className="space-y-1.5 text-right">
                            <Label htmlFor="name_dv" className="text-xs font-black uppercase text-foreground">{t('name_dhivehi')}</Label>
                            <Input
                                id="name_dv"
                                value={formData.name_dv}
                                onChange={(e) => setFormData(prev => ({ ...prev, name_dv: e.target.value }))}
                                required
                                className="text-right apple-glass-input h-11 rounded-2xl font-bold"
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5 text-right">
                        <Label htmlFor="role" className="text-xs font-black uppercase text-foreground">{t('role')}</Label>
                        <Select value={formData.role} onValueChange={handleRoleChange}>
                            <SelectTrigger className="text-right apple-glass-input h-11 rounded-2xl font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="apple-glass-dialog border border-white/20 text-foreground">
                                <SelectItem value="admin" className="text-right">{t('admin')}</SelectItem>
                                <SelectItem value="cashier" className="text-right">{t('cashier')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse bg-white/5 dark:bg-black/20 p-3 rounded-2xl border border-white/10 backdrop-blur-md">
                        <Label htmlFor="isActive" className="text-xs font-bold text-foreground cursor-pointer">{t('active')}</Label>
                        <Checkbox
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
                        />
                    </div>

                    {/* Permissions (only for cashier) */}
                    {formData.role === 'cashier' && (
                        <div className="space-y-4 border-t border-white/10 pt-4">
                            <h3 className="font-black text-sm text-foreground uppercase tracking-widest text-right">{t('permissions')}</h3>

                            {permissionGroups.map((group) => (
                                <div key={group.title} className="space-y-3 bg-white/5 dark:bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                                    <h4 className="font-bold text-xs text-primary text-right">
                                        {group.title}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.permissions.map((perm) => (
                                            <div key={perm.key} className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                                                <Label htmlFor={perm.key} className="text-xs text-foreground cursor-pointer font-medium">
                                                    {perm.label}
                                                </Label>
                                                <Checkbox
                                                    id={perm.key}
                                                    checked={formData.permissions[perm.key]}
                                                    onCheckedChange={(checked) => handlePermissionChange(perm.key, checked as boolean)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isSaving} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase">
                            {isSaving ? 'Saving...' : (user ? t('update') : t('add'))}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UserDialog;
