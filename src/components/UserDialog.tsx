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
import { showSuccess } from '@/utils/toast';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
                (updates as any).password = formData.password;
            }
            await updateUser(user.id, updates);
            showSuccess(t('user_updated'));
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
            // showSuccess is handled inside addUser or should be called after await
            showSuccess(t('user_created'));
        }

        onSave();
        onOpenChange(false);
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto font-faruma">
                <DialogHeader>
                    <DialogTitle>{user ? t('edit_user') : t('add_user')}</DialogTitle>
                    <DialogDescription>
                        {user ? t('edit_user_description') : t('add_user_description')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username">{t('username')}</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            required
                            disabled={!!user}
                            className="text-right"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label htmlFor="password">
                            {t('password')} {user && `(${t('leave_blank_to_keep')})`}
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            required={!user}
                            className="text-right"
                        />
                    </div>

                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name_en">{t('name_english')}</Label>
                            <Input
                                id="name_en"
                                value={formData.name_en}
                                onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name_dv">{t('name_dhivehi')}</Label>
                            <Input
                                id="name_dv"
                                value={formData.name_dv}
                                onChange={(e) => setFormData(prev => ({ ...prev, name_dv: e.target.value }))}
                                required
                                className="text-right"
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-2">
                        <Label htmlFor="role">{t('role')}</Label>
                        <Select value={formData.role} onValueChange={handleRoleChange}>
                            <SelectTrigger className="text-right">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">{t('admin')}</SelectItem>
                                <SelectItem value="cashier">{t('cashier')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                        <Label htmlFor="isActive">{t('active')}</Label>
                        <Checkbox
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked as boolean }))}
                        />
                    </div>

                    {/* Permissions (only for cashier) */}
                    {formData.role === 'cashier' && (
                        <div className="space-y-4 border-t pt-4">
                            <h3 className="font-semibold text-lg">{t('permissions')}</h3>

                            {permissionGroups.map((group) => (
                                <div key={group.title} className="space-y-3">
                                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">
                                        {group.title}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.permissions.map((perm) => (
                                            <div key={perm.key} className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                                                <Label htmlFor={perm.key} className="text-sm cursor-pointer">
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
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit">
                            {user ? t('update') : t('add')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UserDialog;
