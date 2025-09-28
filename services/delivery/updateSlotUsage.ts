import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { QueryRunner } from "typeorm";

/**
 * Increments the usage count for a delivery slot within a transaction
 * This should be called when an order is assigned to a slot
 * @param slotId The ID of the delivery slot to increment usage for
 * @param queryRunner The database transaction query runner
 */
export async function incrementSlotUsage(slotId: number, queryRunner: QueryRunner): Promise<void> {
  try {
    const slotRepository = queryRunner.manager.getRepository(DeliverySlot);

    // Find the slot
    const slot = await slotRepository.findOneBy({ id: slotId });

    if (!slot) {
      throw new Error(`Delivery slot with ID ${slotId} not found`);
    }

    // Check if incrementing would exceed capacity
    if (slot.currentUsage >= slot.maxCapacity) {
      throw new Error(`Cannot increment usage for slot ${slotId}: already at maximum capacity`);
    }

    // Increment usage atomically
    await queryRunner.query(
      'UPDATE delivery_slot SET currentUsage = currentUsage + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [slotId]
    );

  } catch (error) {
    console.error(`Error incrementing slot usage for slot ${slotId}:`, error);
    throw error;
  }
}

/**
 * Decrements the usage count for a delivery slot within a transaction
 * This should be called when an order is cancelled or refunded
 * @param slotId The ID of the delivery slot to decrement usage for
 * @param queryRunner The database transaction query runner
 */
export async function decrementSlotUsage(slotId: number, queryRunner: QueryRunner): Promise<void> {
  try {
    const slotRepository = queryRunner.manager.getRepository(DeliverySlot);

    // Find the slot
    const slot = await slotRepository.findOneBy({ id: slotId });

    if (!slot) {
      throw new Error(`Delivery slot with ID ${slotId} not found`);
    }

    // Check if decrementing would go below zero
    if (slot.currentUsage <= 0) {
      console.warn(`Warning: Attempting to decrement usage for slot ${slotId} but currentUsage is already 0`);
      return;
    }

    // Decrement usage atomically
    await queryRunner.query(
      'UPDATE delivery_slot SET currentUsage = currentUsage - 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [slotId]
    );

  } catch (error) {
    console.error(`Error decrementing slot usage for slot ${slotId}:`, error);
    throw error;
  }
}

/**
 * Gets the current usage statistics for a delivery slot
 * @param slotId The ID of the delivery slot
 * @param queryRunner The database query runner
 * @returns Object with current usage and capacity information
 */
export async function getSlotUsageStats(slotId: number, queryRunner: QueryRunner): Promise<{
  currentUsage: number;
  maxCapacity: number;
  availableCapacity: number;
  isAtCapacity: boolean;
}> {
  try {
    const slotRepository = queryRunner.manager.getRepository(DeliverySlot);

    const slot = await slotRepository.findOneBy({ id: slotId });

    if (!slot) {
      throw new Error(`Delivery slot with ID ${slotId} not found`);
    }

    const availableCapacity = slot.maxCapacity - slot.currentUsage;

    return {
      currentUsage: slot.currentUsage,
      maxCapacity: slot.maxCapacity,
      availableCapacity: Math.max(0, availableCapacity),
      isAtCapacity: slot.currentUsage >= slot.maxCapacity
    };

  } catch (error) {
    console.error(`Error getting slot usage stats for slot ${slotId}:`, error);
    throw error;
  }
}