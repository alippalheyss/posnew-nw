/**
 * Generates and adapts placeholder image URLs for products.
 * Uses soft, low-contrast pastel tones in light mode to avoid harsh/screaming colors.
 */

// Soft, modern, low-contrast pastel backgrounds with harmonious typography for Light Mode
export const LIGHT_COLORS = [
    { bg: 'E0E7FF', fg: '4338CA' }, // Soft Indigo
    { bg: 'DBEAFE', fg: '1D4ED8' }, // Soft Blue
    { bg: 'EDE9FE', fg: '6D28D9' }, // Soft Violet
    { bg: 'D1FAE5', fg: '047857' }, // Soft Emerald
    { bg: 'FEF3C7', fg: 'B45309' }, // Soft Amber
    { bg: 'FFE4E6', fg: 'BE123C' }, // Soft Rose
    { bg: 'CCFBF1', fg: '0F766E' }, // Soft Teal
    { bg: 'CFFAFE', fg: '0E7490' }, // Soft Cyan
    { bg: 'FFEDD5', fg: 'C2410C' }, // Soft Orange
    { bg: 'F3E8FF', fg: '7E22CE' }, // Soft Purple
    { bg: 'E2E8F0', fg: '334155' }, // Soft Slate
    { bg: 'FCE7F3', fg: '9D174D' }, // Soft Pink
];

// Dark mode palette: Deep, muted, low-contrast dark backgrounds
export const DARK_COLORS = [
    { bg: '1E293B', fg: '94A3B8' }, // Slate
    { bg: '1E1B4B', fg: 'A5B4FC' }, // Indigo
    { bg: '172554', fg: '93C5FD' }, // Blue
    { bg: '064E3B', fg: '6EE7B7' }, // Emerald
    { bg: '451A03', fg: 'FCD34D' }, // Amber
    { bg: '4C0519', fg: 'FDA4AF' }, // Rose
    { bg: '134E4A', fg: '5EEAD4' }, // Teal
    { bg: '3B0764', fg: 'D8B4FE' }, // Purple
];

/**
 * Generate a placeholder image URL for a product
 * @param productName - The name of the product to display on the placeholder
 * @param itemCode - Optional item code to ensure consistent colors for the same product
 * @param isDark - Whether the image should be tailored for dark mode (defaults to false for soft light mode)
 * @returns URL string for the placeholder image
 */
export const generatePlaceholderImage = (productName: string, itemCode?: string, isDark: boolean = false): string => {
    const seed = itemCode || productName;
    const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const colorIndex = Math.abs(hashCode(seed)) % colors.length;
    const color = colors[colorIndex];

    const displayName = productName.length > 15
        ? productName.substring(0, 12) + '...'
        : productName;

    const encodedName = encodeURIComponent(displayName);
    return `https://placehold.co/100x100/${color.bg}/${color.fg}?text=${encodedName}`;
};

/**
 * Adapts an existing product image URL for the current theme.
 * If the image is an automatic placeholder (e.g. from placehold.co),
 * it rewrites it to use low-contrast soft pastel colors in light mode.
 */
export const getAdaptedImageUrl = (
    image: string | undefined | null,
    productName: string = 'Product',
    itemCode?: string,
    isDark?: boolean
): string => {
    const isDarkMode = isDark !== undefined
        ? isDark
        : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false);

    if (!image || image === '/placeholder.svg') {
        return generatePlaceholderImage(productName, itemCode, isDarkMode);
    }

    // If it's a placehold.co URL, adapt its color scheme to current theme (soft pastel in light mode)
    if (typeof image === 'string' && image.includes('placehold.co')) {
        const seed = itemCode || productName;
        const colors = isDarkMode ? DARK_COLORS : LIGHT_COLORS;
        const colorIndex = Math.abs(hashCode(seed)) % colors.length;
        const color = colors[colorIndex];

        const textMatch = image.match(/[?&]text=([^&]+)/);
        const textParam = textMatch ? `?text=${textMatch[1]}` : `?text=${encodeURIComponent(productName.substring(0, 12))}`;

        return `https://placehold.co/100x100/${color.bg}/${color.fg}${textParam}`;
    }

    return image;
};

/**
 * Simple hash function to convert string to number
 * Used to consistently assign colors based on product name/code
 */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}
