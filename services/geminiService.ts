
import { GoogleGenAI, Type } from "@google/genai";
import { Product } from '../types';

// Initialize Gemini Client using the required named parameter and environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Identify products from an image based on current inventory
export const identifyProductsFromImage = async (
  base64Image: string, 
  inventory: Product[]
): Promise<{ productName: string; quantity: number }[]> => {
  
  if (!inventory.length) return [];

  const inventoryList = inventory.map(p => p.name).join(", ");
  // Using gemini-3-flash-preview as the recommended model for basic multimodal tasks
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are a supermarket checkout AI. 
    Analyze the provided image. 
    Identify which products from the following INVENTORY LIST are present in the image.
    INVENTORY LIST: [${inventoryList}]
    
    Rules:
    1. Only return items that strictly fuzzy match names in the INVENTORY LIST.
    2. Count the quantity of each item seen.
    3. If an item in the image is not in the list, ignore it.
    4. Return a JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              quantity: { type: Type.INTEGER }
            }
          }
        }
      }
    });

    // Access .text property directly, not as a method
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return [];
  }
};

// 2. Suggest product details for a new item image
export const suggestProductDetails = async (base64Image: string): Promise<{ name: string; unit: string } | null> => {
  // Using gemini-3-flash-preview as the recommended model for basic multimodal tasks
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Analyze this supermarket product image.
    Suggest a short, descriptive Product Name (e.g., "Maggi Noodles 100g", "Coca Cola 500ml").
    Suggest the most likely unit type from this list: [pcs, kg, g, L, ml, Pack, Bottle, Box, Dozen, m, Bundle, Tray, Can, Jar].
    Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            unit: { type: Type.STRING }
          }
        }
      }
    });

    // Access .text property directly
    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return null;
  }
};

// 3. Read Barcode from Image
export const readBarcodeFromImage = async (base64Image: string): Promise<string | null> => {
  // Using gemini-3-flash-preview as the recommended model for basic multimodal tasks
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Analyze the image. 
    Locate the barcode and read the numbers. 
    Return ONLY the barcode number as a string. 
    If no barcode is clearly visible, return null.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            barcode: { type: Type.STRING, nullable: true }
          }
        }
      }
    });

    // Access .text property directly
    const result = JSON.parse(response.text || "{}");
    return result.barcode || null;

  } catch (error) {
    console.error("Gemini Barcode Error:", error);
    return null;
  }
};
