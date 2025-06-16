import { IOrderItemInput } from "../../types/schema";

// Simulate the pricing database, in production environment, it will be fetched from the database
const PRICE_LOOKUP: Record<string, number> = {
  'SKU001': 10.99,
  'SKU002': 15.50,
  'SKU003': 5.99,
  'SKU004': 20.00,
  'SKU005': 7.49,
};

// Simulate the discount rules, in production environment, it will be fetched from the configuration or database
const DISCOUNT_RULES: Record<string, { type: string; value: number }> = {
  'SKU001': { type: 'percent', value: 10 }, // 10% off
  'SKU002': { type: 'fixed', value: 2.00 }, // $2 off
};

export interface PriceDetails {
  itemPrices: Record<string, number>;
  itemDiscounts: Record<string, number>;
  subtotal: number;
  totalDiscount: number;
  totalAmount: number;
}

/**
 * Calculates the price details for a list of order items
 * Applies discount rules and returns a complete breakdown
 */
export async function calculatePrice(items: IOrderItemInput[]): Promise<PriceDetails> {
  // Initialize result structure
  const result: PriceDetails = {
    itemPrices: {},
    itemDiscounts: {},
    subtotal: 0,
    totalDiscount: 0,
    totalAmount: 0,
  };

  // Calculate price for each item
  for (const item of items) {
    // Get the base price from lookup
    const basePrice = PRICE_LOOKUP[item.skuId] || 0;
    
    // Calculate the discount if applicable
    let discount = 0;
    if (DISCOUNT_RULES[item.skuId]) {
      const rule = DISCOUNT_RULES[item.skuId];
      
      if (rule.type === 'percent') {
        discount = basePrice * (rule.value / 100);
      } else if (rule.type === 'fixed') {
        discount = rule.value;
      }
    }
    
    // Calculate item totals
    const itemSubtotal = (basePrice - discount) * item.qty;
    const itemTotalDiscount = discount * item.qty;
    
    // Update result
    result.itemPrices[item.skuId] = basePrice;
    result.itemDiscounts[item.skuId] = discount;
    result.subtotal += basePrice * item.qty;
    result.totalDiscount += itemTotalDiscount;
  }

  // Calculate total amount after discounts
  result.totalAmount = result.subtotal - result.totalDiscount;

  return result;
} 