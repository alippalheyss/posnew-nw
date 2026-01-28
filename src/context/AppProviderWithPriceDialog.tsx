import React, { useState, useEffect } from 'react';
import { AppContextProvider, ProductPriceUpdate, useAppContext } from '@/context/AppContext';
import PriceFixDialog from '@/components/PriceFixDialog';

// Internal component that has access to AppContext
const PriceFixDialogManager: React.FC = () => {
    const { products, updateProduct } = useAppContext();
    const [priceUpdateQueue, setPriceUpdateQueue] = useState<ProductPriceUpdate[]>([]);
    const [currentPriceUpdate, setCurrentPriceUpdate] = useState<ProductPriceUpdate | null>(null);

    // Listen for products that need price updates
    useEffect(() => {
        const productsNeedingUpdate = products.filter(p => {
            if (!p.cost_price || p.cost_price === 0) return false;
            const minSellingPrice = p.cost_price * 1.2;
            return p.price < minSellingPrice;
        });

        if (productsNeedingUpdate.length > 0 && priceUpdateQueue.length === 0) {
            const updates: ProductPriceUpdate[] = productsNeedingUpdate.map(p => ({
                product: p,
                newCostPrice: p.cost_price!,
                currentSellingPrice: p.price,
                recommendedSellingPrice: p.cost_price! * 1.2
            }));
            setPriceUpdateQueue(updates);
        }
    }, [products]);

    // Show next price update dialog
    useEffect(() => {
        if (priceUpdateQueue.length > 0 && !currentPriceUpdate) {
            setCurrentPriceUpdate(priceUpdateQueue[0]);
        }
    }, [priceUpdateQueue, currentPriceUpdate]);

    const handleConfirm = (productId: string, newPrice: number) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            updateProduct({ ...product, price: newPrice });
        }

        // Remove from queue and show next
        setPriceUpdateQueue(prev => prev.slice(1));
        setCurrentPriceUpdate(null);
    };

    const handleCancel = () => {
        // Skip this product and show next
        setPriceUpdateQueue(prev => prev.slice(1));
        setCurrentPriceUpdate(null);
    };

    return (
        <PriceFixDialog
            isOpen={currentPriceUpdate !== null}
            priceUpdate={currentPriceUpdate}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );
};

// Wrapper component that provides both AppContext and PriceFixDialog
export const AppProviderWithPriceDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <AppContextProvider>
            {children}
            <PriceFixDialogManager />
        </AppContextProvider>
    );
};
