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
import { PlusCircle, Building2, Pencil, Trash2, Search, Info, Phone, Mail, MapPin, Hash, User } from 'lucide-react';
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

    const handleAddVendor = () => {
        if (!vendorForm.name_en || !vendorForm.phone) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const newVendor: Vendor = {
            id: `vendor-${Date.now()}`,
            code: getNextVendorCode(),
            ...vendorForm
        };

        addVendor(newVendor);
        setIsAddDialogOpen(false);
        resetForm();
        showSuccess(t('vendor_added_successfully'));
    };

    const handleEditVendor = () => {
        if (!selectedVendor) return;
        if (!vendorForm.name_en || !vendorForm.phone) {
            showError(t('fill_all_fields_error'));
            return;
        }

        const updatedVendor: Vendor = {
            ...selectedVendor,
            ...vendorForm
        };

        updateVendor(updatedVendor);
        setIsEditDialogOpen(false);
        setSelectedVendor(null);
        resetForm();
        showSuccess(t('vendor_updated_successfully'));
    };

    const handleDeleteVendor = () => {
        if (!selectedVendor) return;
        deleteVendor(selectedVendor.id);
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
        <div className="p-6 font-faruma flex flex-col h-full bg-[#050510] text-white overflow-hidden" dir="rtl">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-8">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-white flex items-center justify-end gap-3">
                        {renderBoth('vendors')} <Building2 className="h-8 w-8 text-primary" />
                    </h1>
                    <p className="text-sm text-white/40 mt-1">{renderBoth('manage_vendor_information')}</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 rounded-xl font-black shadow-[0_0_20px_rgba(0,132,255,0.3)]">
                        <PlusCircle className="h-4 w-4" /> {renderBoth('add_vendor')}
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-8">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                <Input
                    placeholder={t('search_vendors')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border-white/10 rounded-xl pr-12 h-14 text-right font-bold focus:border-primary/50 transition-all text-lg"
                />
            </div>

            {/* Vendors Table/List Container */}
            <Card className="bg-[#0a0a1a] border-white/5 rounded-3xl overflow-hidden flex-1 flex flex-col shadow-2xl">
                <CardHeader className="border-b border-white/5 px-6 py-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                         <span className="text-xs font-black text-white/40 uppercase tracking-widest">{filteredVendors.length} VENDORS FOUND</span>
                    </div>
                    <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                        Vendor Inventory <Info className="h-4 w-4 text-white/20" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full custom-scrollbar">
                        <Table dir="rtl">
                            <TableHeader className="bg-white/5 sticky top-0 z-10">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Code</TableHead>
                                    <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Vendor Name</TableHead>
                                    <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Contact</TableHead>
                                    <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">TIN</TableHead>
                                    <TableHead className="text-right font-black text-white/40 uppercase text-[10px] tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredVendors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20 text-white/20 font-black uppercase tracking-[0.2em]">
                                            {searchTerm ? t('no_vendors_found') : t('no_vendors_yet')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredVendors.map((vendor) => (
                                        <TableRow key={vendor.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                            <TableCell className="text-right">
                                                <span className="font-mono text-sm text-primary font-black bg-primary/10 px-3 py-1 rounded-full">{vendor.code}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col">
                                                   <span className="font-black text-white group-hover:text-primary transition-colors">{vendor.name_dv || vendor.name_en}</span>
                                                   <span className="text-[10px] text-white/40 uppercase font-bold">{vendor.name_en}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col gap-1">
                                                   <div className="flex items-center justify-end gap-2 text-xs font-bold text-white/60">
                                                      <span>{vendor.phone}</span>
                                                      <Phone className="h-3 w-3 text-white/20" />
                                                   </div>
                                                   {vendor.contact_person && (
                                                     <div className="flex items-center justify-end gap-2 text-[10px] text-white/40">
                                                        <span>{vendor.contact_person}</span>
                                                        <User className="h-3 w-3 text-white/20" />
                                                     </div>
                                                   )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-white/40">{vendor.tin_number || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(vendor)}
                                                        className="h-9 w-9 rounded-xl hover:bg-blue-500/10 text-blue-400 border border-transparent hover:border-blue-500/20"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openDeleteDialog(vendor)}
                                                        className="h-9 w-9 rounded-xl hover:bg-red-500/10 text-red-400 border border-transparent hover:border-red-500/20"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Add/Edit Vendor Dialogs */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="sm:max-w-[600px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right text-2xl font-black">{renderBoth('add_vendor')}</DialogTitle>
                        <DialogDescription className="text-right text-white/40">{renderBoth('enter_vendor_details')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('vendor_name_en')}*</Label>
                                <Input value={vendorForm.name_en} onChange={(e) => setVendorForm({ ...vendorForm, name_en: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" placeholder="e.g. STO" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('vendor_name_dv')}</Label>
                                <Input value={vendorForm.name_dv} onChange={(e) => setVendorForm({ ...vendorForm, name_dv: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" placeholder="އެސް.ޓީ.އޯ" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('phone')}*</Label>
                                <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="text-right h-12 font-mono bg-white/5 border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('contact_person')}</Label>
                                <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('email')}</Label>
                                <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('tin_number')}</Label>
                                <Input value={vendorForm.tin_number} onChange={(e) => setVendorForm({ ...vendorForm, tin_number: e.target.value })} className="text-right h-12 font-mono bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('address')}</Label>
                            <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white">
                            {renderBoth('cancel')}
                        </Button>
                        <Button onClick={handleAddVendor} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black">
                            {renderBoth('save_changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Vendor Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[600px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right text-2xl font-black">{renderBoth('edit_vendor')}</DialogTitle>
                        <DialogDescription className="text-right text-white/40">{renderBoth('update_vendor_details')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        {/* Same form as Add Vendor */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('vendor_name_en')}*</Label>
                                <Input value={vendorForm.name_en} onChange={(e) => setVendorForm({ ...vendorForm, name_en: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('vendor_name_dv')}</Label>
                                <Input value={vendorForm.name_dv} onChange={(e) => setVendorForm({ ...vendorForm, name_dv: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('phone')}*</Label>
                                <Input value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} className="text-right h-12 font-mono bg-white/5 border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('contact_person')}</Label>
                                <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('email')}</Label>
                                <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('tin_number')}</Label>
                                <Input value={vendorForm.tin_number} onChange={(e) => setVendorForm({ ...vendorForm, tin_number: e.target.value })} className="text-right h-12 font-mono bg-white/5 border-white/10 rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right block text-[10px] font-black uppercase text-white/40 tracking-widest">{renderBoth('address')}</Label>
                            <Input value={vendorForm.address} onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })} className="text-right h-12 bg-white/5 border-white/10 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter className="gap-3 pt-4 border-t border-white/5">
                        <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white">
                            {renderBoth('cancel')}
                        </Button>
                        <Button onClick={handleEditVendor} className="flex-1 h-12 bg-primary hover:bg-primary/90 font-black">
                            {renderBoth('save_changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px] font-faruma bg-[#0a0a1a] border-white/10 text-white" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right text-2xl font-black text-red-500">{renderBoth('delete_vendor')}</DialogTitle>
                        <DialogDescription className="text-right text-white/40">
                            {t('delete_vendor_confirmation', { vendor: selectedVendor?.name_en })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 gap-3">
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 border-white/10 hover:bg-white/5 text-white">
                            {renderBoth('cancel')}
                        </Button>
                        <Button onClick={handleDeleteVendor} className="flex-1 h-12 bg-red-600 hover:bg-red-700 font-black text-white">
                            {renderBoth('delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Vendors;
