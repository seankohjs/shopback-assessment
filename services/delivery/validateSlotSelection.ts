import { DeliverySlot } from "../../models/entities/DeliverySlot";
import AppDataSource from "../../models/typeorm";

export interface SlotValidationResult {
  isValid: boolean;
  slot?: DeliverySlot;
  reason?: string;
}

/**
 * Validates if a delivery slot can be selected for an order
 * Checks if the slot exists, is active, and has available capacity
 * @param slotId The ID of the delivery slot to validate
 * @returns Promise<SlotValidationResult> Validation result with slot data or error reason
 */
export async function validateSlotSelection(slotId: number): Promise<SlotValidationResult> {
  try {
    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    const slotRepository = dataSource.getRepository(DeliverySlot);

    // Find the delivery slot by ID
    const slot = await slotRepository.findOneBy({ id: slotId });

    if (!slot) {
      return {
        isValid: false,
        reason: `Delivery slot with ID ${slotId} does not exist`
      };
    }

    // Check if slot is active
    if (!slot.isActive) {
      return {
        isValid: false,
        slot,
        reason: "Selected delivery slot is not currently active"
      };
    }

    // Check if slot has available capacity
    if (slot.currentUsage >= slot.maxCapacity) {
      return {
        isValid: false,
        slot,
        reason: "Selected delivery slot is fully booked"
      };
    }

    // Check if slot is in the future
    const now = new Date();
    if (slot.startTime <= now) {
      return {
        isValid: false,
        slot,
        reason: "Selected delivery slot has already passed"
      };
    }

    // All validations passed
    return {
      isValid: true,
      slot
    };

  } catch (error) {
    console.error("Error validating slot selection:", error);
    return {
      isValid: false,
      reason: "Error occurred while validating delivery slot"
    };
  }
}