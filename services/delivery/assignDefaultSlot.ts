import AppDataSource from "../../models/typeorm";
import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { SlotStrategy } from "./SlotStrategy";

/**
 * Default slot assignment strategy
 * Assigns the earliest available delivery slot
 */
class DefaultSlotStrategy implements SlotStrategy {
  async assignSlot(): Promise<DeliverySlot | null> {
    // Initialize database connection
    const dataSource = await AppDataSource.initialize();

    // Create repository
    const slotRepository = dataSource.getRepository(DeliverySlot);

    try {
      // Find the earliest available slot that is not at capacity
      const availableSlot = await slotRepository
        .createQueryBuilder("slot")
        .where("slot.isActive = :active", { active: true })
        .andWhere("slot.currentUsage < slot.maxCapacity")
        .andWhere("slot.startTime > :now", { now: new Date() })
        .orderBy("slot.startTime", "ASC")
        .getOne();

      if (!availableSlot) {
        return null;
      }

      // Update the slot usage
      availableSlot.currentUsage += 1;
      await slotRepository.save(availableSlot);

      return availableSlot;
    } catch (error) {
      console.error("Error assigning default slot:", error);
      return null;
    }
  }
}

// Create singleton instance
const defaultStrategy = new DefaultSlotStrategy();

/**
 * Assigns the earliest available delivery slot using the default strategy
 * @returns The assigned delivery slot or null if none are available
 */
export async function assignDefaultSlot(): Promise<DeliverySlot | null> {
  return defaultStrategy.assignSlot();
}
