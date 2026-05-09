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
          barcode: row['barcode'] ? String(row['barcode']) : '',
          item_code: row['item_code'] ? String(row['item_code']) : '',
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
      <DialogContent className="sm:max-w-[425px] font-faruma" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{renderBoth('import_products')}</DialogTitle>
          <DialogDescription className="text-right">
            {renderBoth('upload_excel_to_import_products')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              {renderBoth('excel_file')}
            </Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="col-span-3 text-right"
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} className="font-faruma">
            {renderBoth('cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!file} className="font-faruma">
            <UploadCloud className="h-4 w-4 ml-2" /> {renderBoth('import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductImportDialog;