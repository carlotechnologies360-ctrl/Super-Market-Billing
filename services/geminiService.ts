
import { Product } from '../types';

/**
 * MOCK Gemini Service for local showcase.
 * No API key required.
 */

// 1. Identify products from an image based on current inventory
export const identifyProductsFromImage = async (
  base64Image: string,
  inventory: Product[]
): Promise<{ productName: string; quantity: number }[]> => {
  console.log("Mock identifyProductsFromImage called");
  if (!inventory.length) return [];

  // Return a random item from inventory for demonstration
  const randomProduct = inventory[Math.floor(Math.random() * inventory.length)];
  return [{ productName: randomProduct.name, quantity: 1 }];
};

// 2. Suggest product details for a new item image
export const suggestProductDetails = async (base64Image: string): Promise<{ name: string; unit: string } | null> => {
  console.log("Mock suggestProductDetails called");
  return {
    name: "New Product",
    unit: "pcs"
  };
};

// 3. Read Barcode from Image
export const readBarcodeFromImage = async (base64Image: string): Promise<string | null> => {
  console.log("Mock readBarcodeFromImage called");
  return "8901234567890";
};
