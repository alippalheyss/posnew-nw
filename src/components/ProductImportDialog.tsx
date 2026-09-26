"use client";

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import { showSuccess, showError } from '@/utils/toast';

interface ProductImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newProducts: any[]) => void;
}

const ProductImportDialog: React.FC<ProductImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      showError(t('no_file_selected'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // Assuming the Excel columns match our Product interface structure
        // You might need to map column names if they are different
        const importedProducts = json.map((row: any, index: number) => ({
          id: `imported-${Date.now()}-${index}`, // Generate a unique ID
          name_dv: row['name_dv'] || '',
          name_en: row['name_en'] || '',
          barcode: row['barcode'] ? String(row['barcode']).trim() : '',
          item_code: row['item_code'] ? String(row['item_code']).trim() : '',
          price: parseFloat(row['price']) || 0,
          image: row['image'] || '/placeholder.svg', // Default image if not provided
        }));

        onImport(importedProducts);
        showSuccess(t('products_imported_successfully', { count: importedProducts.length }));
        setFile(null);
        onClose();
      } catch (error) {
        console.error("Error importing Excel file:", error);
        showError(t('error_importing_products'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[440px] font-faruma apple-glass-dialog border-white/20 dark:border-white/10 text-foreground shadow-2xl rounded-3xl p-6 sm:p-7" dir="rtl">
        <DialogHeader className="text-right pb-3 border-b border-white/10">
          <DialogTitle className="text-xl font-black text-foreground flex items-center justify-end gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <span>{renderBoth('import_products')}</span>
          </DialogTitle>
          <DialogDescription className="text-right text-xs text-muted-foreground font-bold mt-1">
            {renderBoth('upload_excel_to_import_products')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2 text-right">
            <Label htmlFor="file" className="text-xs font-black uppercase text-foreground block">
              {renderBoth('excel_file')}
            </Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="apple-glass-input h-12 text-right rounded-2xl file:bg-primary/20 file:text-primary file:border-none file:rounded-xl file:px-3 file:py-1 file:font-bold file:text-xs cursor-pointer"
            />
          </div>
        </div>
        <DialogFooter className="gap-2.5 pt-3 border-t border-white/10 flex flex-row">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11 border-white/20 dark:border-white/10 hover:bg-white/10 text-foreground font-bold text-xs rounded-2xl">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!file} className="flex-1 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-2xl shadow-lg shadow-primary/25 uppercase">
            <UploadCloud className="h-4 w-4 ml-1.5" /> {renderBoth('import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductImportDialog;