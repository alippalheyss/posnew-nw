/**
 * OCR Service using Google Gemini 1.5 Flash
 * Extracts structured purchase data from bill images.
 */

export interface OCRResult {
    vendorName: string;
    billNumber: string;
    date: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
}

const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_AI_KEY;
const GEMINI_MODEL = "gemini-1.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

declare global {
    interface Window {
        puter: any;
    }
}

export const ocrService = {
    /**
     * Analyzes a bill image and returns structured JSON data using Puter.js.
     * @param base64Image The image in base64 format
     */
    async analyzeBill(base64Image: string): Promise<OCRResult> {
        if (!window.puter) {
            // Fallback or wait for it? For now, assume it's there as per index.html
            console.warn("Puter.js not loaded yet. Trying to wait...");
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!window.puter) {
            throw new Error("Puter.js SDK failed to load. Please check your internet connection.");
        }

        const prompt = `
            Analyze this purchase bill/receipt image and extract the following information in JSON format:
            - vendorName: The name of the shop or supplier.
            - billNumber: The invoice or bill number.
            - date: The date of purchase (YYYY-MM-DD format).
            - items: An array of objects with:
                - description: Name of the item.
                - quantity: Number of units.
                - unitPrice: Price per unit.
                - total: Total price for that line item.
            - subtotal: The total before tax.
            - gstAmount: The total GST or tax amount.
            - totalAmount: The final total amount.

            Rules:
            1. If a value is missing, use null or an empty string.
            2. Ensure all numbers are floats or integers.
            3. Return ONLY the JSON object, no other text or markdown markers.
        `;

        try {
            // Convert base64 to a Blob/File for Puter.js
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const file = new File([blob], "bill.jpg", { type: "image/jpeg" });

            const response = await window.puter.ai.chat(prompt, [file]);
            console.log('Puter AI Raw Response:', response);

            // Puter.js returns a response object with a message
            const textResponse = typeof response === 'string' ? response : response?.message?.content || response?.text || "";
            console.log('Puter AI Filtered Text:', textResponse);

            if (!textResponse) {
                throw new Error("Empty response from Puter AI");
            }

            // Strip markdown code blocks if present
            let cleanJson = textResponse.replace(/```json\n?|```/g, "").trim();

            // If it still contains non-JSON text at start/end, try to find the first { and last }
            const firstBrace = cleanJson.indexOf('{');
            const lastBrace = cleanJson.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            console.log('Puter AI Cleaned JSON (Robust):', cleanJson);

            const parsed = JSON.parse(cleanJson) as OCRResult;
            console.log('Puter AI Parsed Object:', parsed);
            return parsed;
        } catch (error) {
            console.error("Puter OCR Error:", error);
            throw error;
        }
    }
};
