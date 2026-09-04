/**
 * Generates and adapts placeholder image URLs for products.
 * Uses soft, low-contrast pastel tones in light mode to avoid harsh/screaming colors.
 */

// User palette for Light Mode: #A0D3E8, #FFFFFF, #F5F5F5, #004B87, #6C757D
export const LIGHT_COLORS = [
    { bg: 'A0D3E8', fg: '004B87' }, // Sky Blue with Deep Navy
    { bg: 'F5F5F5', fg: '004B87' }, // Off-White with Deep Navy
    { bg: 'FFFFFF', fg: '004B87' }, // White with Deep Navy
    { bg: 'A0D3E8', fg: '6C757D' }, // Sky Blue with Muted Slate
    { bg: 'F5F5F5', fg: '6C757D' }, // Off-White with Muted Slate
    { bg: '004B87', fg: 'FFFFFF' }, // Deep Navy with White
    { bg: '004B87', fg: 'A0D3E8' }, // Deep Navy with Sky Blue
    { bg: 'A0D3E8', fg: 'FFFFFF' }, // Sky Blue with White
];

// User palette for Dark Mode: #0F172A, #1E293B, #334155, #475569, #94A3B8, #F1F5F9
export const DARK_COLORS = [
    { bg: '1E293B', fg: 'F1F5F9' }, // Surface with Text Primary
    { bg: '334155', fg: 'F1F5F9' }, // Elevated with Text Primary
    { bg: '0F172A', fg: 'F1F5F9' }, // Darkest with Text Primary
    { bg: '1E293B', fg: '94A3B8' }, // Surface with Text Subtle
    { bg: '334155', fg: '94A3B8' }, // Elevated with Text Subtle
    { bg: '0F172A', fg: '94A3B8' }, // Darkest with Text Subtle
    { bg: '475569', fg: 'F1F5F9' }, // Border tone with Text Primary
    { bg: '1E293B', fg: 'FFFFFF' }, // Surface with White
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
