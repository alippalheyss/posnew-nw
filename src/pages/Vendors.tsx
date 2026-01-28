"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Building2, Pencil, Trash2, Search } from 'lucide-react';
import { useAppContext, Vendor } from '@/context/AppContext';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const Vendors = () => {
    const { t } = useTranslation();
    const { vendors, addVendor, updateVendor, deleteVendor, getNextVendorCode } = useAppContext();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    // Form state for new/edit vendor
    const [vendorForm, setVendorForm] = useState({
        name_dv: '',
        name_en: '',
        contact_person: '',
        phone: '',
        email: '',
        tin_number: '',
        address: '',
        notes: ''
    });

    const renderBoth = (key: string, options?: any) => (
        <>
            {t(key, options)} ({t(key, { ...options, lng: 'en' })})
        </>
    );

    const resetForm = () => {
        setVendorForm({
            name_dv: '',
            name_en: '',
            contact_person: '',
            phone: '',
            email: '',
            tin_number: '',
            address: '',
            notes: ''
        });
    };

    const handleAddVendor = async () => {
        if (!vendorForm.name_en || !vendorForm.name_dv || !vendorForm.phone) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const newVendor: Vendor = {
            id: `vendor-${Date.now()}`,
            code: getNextVendorCode(),
            ...vendorForm
        };

        await addVendor(newVendor);
        setIsAddDialogOpen(false);
        resetForm();
        showSuccess(t('vendor_added_successfully'));
    };

    const handleEditVendor = async () => {
        if (!selectedVendor) return;
        if (!vendorForm.name_en || !vendorForm.name_dv || !vendorForm.phone) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const updatedVendor: Vendor = {
            ...selectedVendor,
            ...vendorForm
        };

        await updateVendor(updatedVendor);
        setIsEditDialogOpen(false);
        setSelectedVendor(null);
        resetForm();
        showSuccess(t('vendor_updated_successfully'));
    };

    const handleDeleteVendor = async () => {
        if (!selectedVendor) return;
        await deleteVendor(selectedVendor.id);
        setIsDeleteDialogOpen(false);
        setSelectedVendor(null);
        showSuccess(t('vendor_deleted_successfully'));
    };

    const openEditDialog = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setVendorForm({
            name_dv: vendor.name_dv,
            name_en: vendor.name_en,
            contact_person: vendor.contact_person,
            phone: vendor.phone,
            email: vendor.email,
            tin_number: vendor.tin_number,
            address: vendor.address,
            notes: vendor.notes
        });
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setIsDeleteDialogOpen(true);
    };

    const filteredVendors = vendors.filter(v =>
        v.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.name_dv.includes(searchTerm) ||
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.phone.includes(searchTerm) ||
        v.tin_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 font-faruma flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 overflow-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-20 py-2 border-b">
                <div className="text-right flex-1">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-end gap-3">
                        {renderBoth('vendors')} <Building2 className="h-8 w-8 text-primary" />
                    </h1>
                    <p className="text-sm opacity-60 mt-1">{renderBoth('manage_vendor_information')}</p>
                </div>
                <div className="flex gap-3 mr-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={t('search_vendors')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 w-[250px]"
                        />
                    </div>
                    <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2 bg-primary">
                        <PlusCircle className="h-4 w-4" /> {renderBoth('add_vendor')}
                    </Button>
                </div>
            </div>

            {/* Vendors Table */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-right text-lg flex items-center justify-end gap-2">
                        {renderBoth('vendor_list')} <Building2 className="h-5 w-5 text-primary" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-280px)]">
                        <Table dir="rtl">
                            <TableHeader className="bg-gray-50 dark:bg-black/10 sticky top-0">
                                <TableRow>
                                    <TableHead className="text-right font-bold">{t('actions')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('notes')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('tin_number')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('phone')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('contact_person')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('vendor_name')}</TableHead>
                                    <TableHead className="text-right font-bold">{t('code')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVendors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-gray-400 uppercase tracking-widest text-[10px]">
                                            {searchTerm ? t('no_vendors_found') : t('no_vendors_yet')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id} className="hover:bg-blue-50/30 transition-colors">
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(vendor)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Pencil className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openDeleteDialog(vendor)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-xs opacity-60 max-w-[150px] truncate">{vendor.notes || '-'}</TableCell>
                                            <TableCell className="text-right font-mono text-sm">{vendor.tin_number || '-'}</TableCell>
                                            <TableCell className="text-right font-mono">{vendor.phone}</TableCell>
                                            <TableCell className="text-right">{vendor.contact_person || '-'}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                <div>{vendor.name_dv || vendor.name_en}</div>
                                                <div className="text-xs opacity-60">{vendor.name_en}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm text-primary font-bold">{vendor.code}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Add Vendor Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[600px] font-faruma" dir="rtl">
                    <DialogHeader>
                        <div className="flex justify-between items-center w-full">
                            <Button variant="ghost" size="icon" onClick={() => setIsAddDialogOpen(false)}>X</Button>
                            <DialogTitle className="text-right text-2xl font-black">{renderBoth('add_vendor')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-right">{renderBoth('enter_vendor_details')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('vendor_name_en')}*</Label>
                                <Input value={vendorForm.name_en} onChange={(e) => setVendorForm({ ...vendorForm, name_en: e.target.value })} className="text-right h-11" placeholder="e.g. STO" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('vendor_name_dv')}</Label>
                                <Input value={vendorForm.name_dv} onChange={(e) => setVendorForm({ ...vendorForm, name_dv: e.target.value })} className="text-right h-11" placeholder="އެސް.ޓީ.އޯ" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('phone')}*</Label>
                                <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="text-right h-11 font-mono" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('contact_person')}</Label>
                                <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} className="text-right h-11" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('email')}</Label>
                                <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} className="text-right h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('tin_number')}</Label>
                                <Input value={vendorForm.tin_number} onChange={(e) => setVendorForm({ ...vendorForm, tin_number: e.target.value })} className="text-right h-11 font-mono" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('address')}</Label>
                            <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} className="text-right h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('notes')}</Label>
                            <Input value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} className="text-right h-11" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button onClick={handleAddVendor} className="flex-1 h-12 bg-primary font-bold text-lg">{renderBoth('save_changes')}</Button>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-12">{renderBoth('cancel')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Vendor Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] font-faruma" dir="rtl">
                    <DialogHeader>
                        <div className="flex justify-between items-center w-full">
                            <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)}>X</Button>
                            <DialogTitle className="text-right text-2xl font-black">{renderBoth('edit_vendor')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-right">{renderBoth('update_vendor_details')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('vendor_name_en')}*</Label>
                                <Input value={vendorForm.name_en} onChange={(e) => setVendorForm({ ...vendorForm, name_en: e.target.value })} className="text-right h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('vendor_name_dv')}</Label>
                                <Input value={vendorForm.name_dv} onChange={(e) => setVendorForm({ ...vendorForm, name_dv: e.target.value })} className="text-right h-11" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('phone')}*</Label>
                                <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="text-right h-11 font-mono" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('contact_person')}</Label>
                                <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} className="text-right h-11" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('email')}</Label>
                                <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} className="text-right h-11" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('tin_number')}</Label>
                                <Input value={vendorForm.tin_number} onChange={(e) => setVendorForm({ ...vendorForm, tin_number: e.target.value })} className="text-right h-11 font-mono" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('address')}</Label>
                            <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} className="text-right h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-right block opacity-50 text-[10px] font-bold uppercase">{renderBoth('notes')}</Label>
                            <Input value={vendorForm.notes} onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} className="text-right h-11" />
                        </div>
                    </div>
                    <DialogFooter className="mt-4 gap-3">
                        <Button onClick={handleEditVendor} className="flex-1 h-12 bg-primary font-bold text-lg">{renderBoth('save_changes')}</Button>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1 h-12">{renderBoth('cancel')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] font-faruma" dir="rtl">
                    <DialogHeader>
                        <div className="flex justify-between items-center w-full">
                            <Button variant="ghost" size="icon" onClick={() => setIsDeleteDialogOpen(false)}>X</Button>
                            <DialogTitle className="text-right text-2xl font-black text-red-600">{renderBoth('delete_vendor')}</DialogTitle>
                        </div>
                        <DialogDescription className="text-right">
                            {t('delete_vendor_confirmation', { vendor: selectedVendor?.name_en })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-3">
                        <Button onClick={handleDeleteVendor} variant="destructive" className="flex-1 h-12 font-bold text-lg">{renderBoth('delete')}</Button>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12">{renderBoth('cancel')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Vendors;
