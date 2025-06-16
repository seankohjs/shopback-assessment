import { IOrderItemInput } from "../../types/schema";

// Simulate the inventory database, in production environment, it will be fetched from the database
const INVENTORY: Record<string, { available: number; active: boolean }> = {
  'SKU001': { available: 100, active: true },
  'SKU002': { available: 50, active: true },
  'SKU003': { available: 20, active: true },
  'SKU004': { available: 10, active: true },
  'SKU005': { available: 5, active: false }, // The product is out of stock
};

export interface InventoryValidationResult {
  valid: boolean;
  errors: string[];
  availableItems: Record<string, number>;
}

/**
 * Validates if all requested items are available in sufficient quantity
 */
export async function validateInventory(items: IOrderItemInput[]): Promise<InventoryValidationResult> {
  const errors: string[] = [];
  const availableItems: Record<string, number> = {};
  
  // Check each item for availability
  for (const item of items) {
    // Check if SKU exists in inventory
    if (!INVENTORY[item.skuId]) {
      errors.push(`Item with SKU ${item.skuId} not found in inventory`);
      continue;
    }
    
    const inventoryItem = INVENTORY[item.skuId];
    
    // Check if item is active
    if (!inventoryItem.active) {
      errors.push(`Item with SKU ${item.skuId} is not available for purchase`);
      continue;
    }
    
    // Check if sufficient quantity is available
    if (inventoryItem.available < item.qty) {
      errors.push(`Insufficient quantity available for SKU ${item.skuId}. Requested: ${item.qty}, Available: ${inventoryItem.available}`);
      continue;
    }
    
    // Item is available in sufficient quantity
    availableItems[item.skuId] = inventoryItem.available;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    availableItems
  };
}

/**
 * Updates inventory levels after an order is created
 * This would be called after the order is successfully created
 */
export async function updateInventory(items: IOrderItemInput[]): Promise<void> {
  // In a real implementation, this would update the database
  // For simulation, we'll just update the in-memory inventory
  
  for (const item of items) {
    if (INVENTORY[item.skuId]) {
      INVENTORY[item.skuId].available -= item.qty;
    }
  }
} 