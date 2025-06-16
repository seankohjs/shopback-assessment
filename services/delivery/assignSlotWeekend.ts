import AppDataSource from "../../models/typeorm";
import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { SlotStrategy } from "./SlotStrategy";

/**
 * Weekend slot assignment strategy
 * Prioritizes weekend slots (Saturday and Sunday)
 */
class WeekendSlotStrategy implements SlotStrategy {
  async assignSlot(): Promise<DeliverySlot | null> {
    // Initialize database connection
    const dataSource = await AppDataSource.initialize();

    // Create repository
    const slotRepository = dataSource.getRepository(DeliverySlot);

    try {
      // Helper function to determine if a date is on a weekend (Saturday or Sunday)
      const isWeekend = (date: Date): boolean => {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
      };

      // Current date and time
      const now = new Date();

      // First try to find weekend slots in the near future
      let availableSlot = await slotRepository
        .createQueryBuilder("slot")
        .where("slot.isActive = :active", { active: true })
        .andWhere("slot.currentUsage < slot.maxCapacity")
        .andWhere("slot.startTime > :now", { now })
        .orderBy("slot.startTime", "ASC")
        .getMany();

      // Filter for weekend slots and sort by start time
      const weekendSlots = availableSlot
        .filter((slot) => isWeekend(new Date(slot.startTime)))
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

      // If no weekend slots are found, fall back to the earliest available slot
      if (weekendSlots.length === 0) {
        const fallbackSlot = await slotRepository
          .createQueryBuilder("slot")
          .where("slot.isActive = :active", { active: true })
          .andWhere("slot.currentUsage < slot.maxCapacity")
          .andWhere("slot.startTime > :now", { now })
          .orderBy("slot.startTime", "ASC")
          .getOne();

        if (!fallbackSlot) {
          return null;
        }

        // Update usage count
        fallbackSlot.currentUsage += 1;
        await slotRepository.save(fallbackSlot);

        return fallbackSlot;
      }

      // Take the earliest weekend slot
      const selectedSlot = weekendSlots[0];

      // Update usage count
      selectedSlot.currentUsage += 1;
      await slotRepository.save(selectedSlot);

      return selectedSlot;
    } catch (error) {
      console.error("Error assigning weekend slot:", error);
      return null;
    }
  }
}

// Create singleton instance
const weekendStrategy = new WeekendSlotStrategy();

/**
 * Assigns a delivery slot prioritizing weekends using the weekend strategy
 * @returns The assigned delivery slot or null if none are available
 */
export async function assignWeekendSlot(): Promise<DeliverySlot | null> {
  return weekendStrategy.assignSlot();
}
