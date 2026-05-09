/**
 * Generates a placeholder image URL for a product
 * Uses placehold.co service with random colors and product name
 */

const COLORS = [
    { bg: 'FF0000', fg: 'FFFFFF' }, // Red
    { bg: '0000FF', fg: 'FFFFFF' }, // Blue
    { bg: 'FFD700', fg: '000000' }, // Gold
    { bg: '008000', fg: 'FFFFFF' }, // Green
    { bg: '800080', fg: 'FFFFFF' }, // Purple
    { bg: 'FFA500', fg: 'FFFFFF' }, // Orange
    { bg: 'FF69B4', fg: 'FFFFFF' }, // Pink
    { bg: '00CED1', fg: 'FFFFFF' }, // Turquoise
    { bg: 'DC143C', fg: 'FFFFFF' }, // Crimson
    { bg: '4169E1', fg: 'FFFFFF' }, // Royal Blue
    { bg: 'FF6347', fg: 'FFFFFF' }, // Tomato
    { bg: '32CD32', fg: 'FFFFFF' }, // Lime Green
    { bg: '8B4513', fg: 'FFFFFF' }, // Saddle Brown
    { bg: '00FFFF', fg: '000000' }, // Cyan
    { bg: 'FF8C00', fg: 'FFFFFF' }, // Dark Orange
];

/**
 * Generate a placeholder image URL for a product
 * @param productName - The name of the product to display on the placeholder
 * @param itemCode - Optional item code to ensure consistent colors for the same product
 * @returns URL string for the placeholder image
 */
export const generatePlaceholderImage = (productName: string, itemCode?: string): string => {
    // Use item code or product name to determine color (consistent for same product)
    const seed = itemCode || productName;
    const colorIndex = Math.abs(hashCode(seed)) % COLORS.length;
    const color = COLORS[colorIndex];

    // Truncate product name if too long (max 15 characters for readability)
    const displayName = productName.length > 15
        ? productName.substring(0, 12) + '...'
        : productName;

    // Encode the product name for URL
    const encodedName = encodeURIComponent(displayName);

    return `https://placehold.co/100x100/${color.bg}/${color.fg}?text=${encodedName}`;
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
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
}
