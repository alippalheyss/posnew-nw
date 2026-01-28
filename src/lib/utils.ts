import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to safely stringify objects
export function safeStringify(obj: any): string {
  try {
    if (typeof obj === 'object' && obj !== null) {
      return JSON.stringify(obj);
    }
    return String(obj);
  } catch (error) {
    return '[Object]';
  }
}