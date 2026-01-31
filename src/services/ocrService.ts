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

export const ocrService = {
    /**
     * Analyzes a bill image and returns structured JSON data.
     * @param base64Image The image in base64 format (with or without data:image/ prefix)
     */
    async analyzeBill(base64Image: string): Promise<OCRResult> {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_google_ai_studio_key_here') {
            throw new Error("Google AI API Key is missing. Please add VITE_GOOGLE_AI_KEY to your .env.local file.");
        }

        // Strip prefix if present
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

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
            3. Return ONLY the JSON object, no other text.
        `;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: cleanBase64
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        response_mime_type: "application/json",
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Failed to communicate with Gemini API");
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResponse) {
                throw new Error("Empty response from AI");
            }

            return JSON.parse(textResponse) as OCRResult;
        } catch (error) {
            console.error("OCR Error:", error);
            throw error;
        }
    }
};
