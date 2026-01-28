// Authentication utility functions

/**
 * Simple hash function for passwords
 * Note: This is a basic hash for demonstration. In production, use bcrypt or similar.
 */
export const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
};

/**
 * Compare a plain password with a hashed password
 */
export const comparePassword = (plain: string, hashed: string): boolean => {
    return hashPassword(plain) === hashed;
};

/**
 * Generate a unique user ID
 */
export const generateUserId = (): string => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get current timestamp in ISO format
 */
export const getCurrentTimestamp = (): string => {
    return new Date().toISOString();
};
