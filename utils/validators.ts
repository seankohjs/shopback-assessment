import { IOrderInput, IDeliverySlotInput, IUserInput, INotificationInput } from "../types/schema";

/**
 * Validates input for creating a new order
 */
export function validateOrderInput(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if required fields exist
  if (!input) {
    return { valid: false, errors: ["Order input is required"] };
  }
  
  if (typeof input !== 'object') {
    return { valid: false, errors: ["Order input must be an object"] };
  }
  
  // Check required fields
  if (!input.userId) {
    errors.push("userId is required");
  } else if (typeof input.userId !== 'number') {
    errors.push("userId must be a number");
  }
  
  if (!input.addressId) {
    errors.push("addressId is required");
  } else if (typeof input.addressId !== 'number') {
    errors.push("addressId must be a number");
  }

  
  // Validate items array
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    errors.push("items array is required and must not be empty");
  } else {
    // Validate each item in the array
    input.items.forEach((item: any, index: number) => {
      if (!item.skuId) {
        errors.push(`Item at index ${index} is missing skuId`);
      }
      
      if (!item.qty || typeof item.qty !== 'number' || item.qty <= 0) {
        errors.push(`Item at index ${index} has invalid quantity`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates input for a delivery slot
 */
export function validateDeliverySlotInput(input: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if required fields exist
  if (!input) {
    return { valid: false, errors: ["DeliverySlot input is required"] };
  }
  
  if (typeof input !== 'object') {
    return { valid: false, errors: ["DeliverySlot input must be an object"] };
  }
  
  // Check required fields
  if (!input.startTime) {
    errors.push("startTime is required");
  } else if (!(input.startTime instanceof Date) && !(new Date(input.startTime) instanceof Date)) {
    errors.push("startTime must be a valid date");
  }
  
  if (!input.endTime) {
    errors.push("endTime is required");
  } else if (!(input.endTime instanceof Date) && !(new Date(input.endTime) instanceof Date)) {
    errors.push("endTime must be a valid date");
  }
  
  if (input.startTime && input.endTime) {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);
    
    if (start >= end) {
      errors.push("startTime must be before endTime");
    }
  }
  
  if (!input.maxCapacity) {
    errors.push("maxCapacity is required");
  } else if (typeof input.maxCapacity !== 'number' || input.maxCapacity <= 0) {
    errors.push("maxCapacity must be a positive number");
  }
  
  // Optional field validation
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') {
    errors.push("isActive must be a boolean value");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Utility function to check if a delivery slot is available
 */
export function isSlotAvailable(slot: any): boolean {
  if (!slot) return false;
  
  return slot.isActive && slot.currentUsage < slot.maxCapacity;
}

/**
 * Validate if a date is a reasonable future date (not too far in the future)
 */
export function isValidFutureDate(date: Date): boolean {
  const now = new Date();
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(now.getFullYear() + 1); // Max 1 year in the future
  
  return date > now && date < maxFutureDate;
} 