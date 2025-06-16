import { DeliverySlot } from "../../models/entities/DeliverySlot";

/**
 * Strategy pattern interface for delivery slot assignment
 */
export interface SlotStrategy {
  /**
   * Assign a delivery slot based on specific criteria
   * @returns The assigned delivery slot or null if no slots are available
   */
  assignSlot(): Promise<DeliverySlot | null>;
}

/**
 * Factory to get a specific slot assignment strategy
 */
export class SlotStrategyFactory {
  private static strategies: Record<string, SlotStrategy> = {};
  
  /**
   * Register a slot assignment strategy
   * @param name Strategy name
   * @param strategy Strategy implementation
   */
  static register(name: string, strategy: SlotStrategy): void {
    this.strategies[name] = strategy;
  }
  
  /**
   * Get a strategy by name
   * @param name Strategy name
   * @returns The requested strategy or null if not found
   */
  static get(name: string): SlotStrategy | null {
    return this.strategies[name] || null;
  }
  
  /**
   * Get the default strategy
   * @returns The default slot assignment strategy
   */
  static getDefault(): SlotStrategy {
    // Return the first registered strategy or throw an error if none exist
    const keys = Object.keys(this.strategies);
    if (keys.length === 0) {
      throw new Error('No slot assignment strategies registered');
    }
    return this.strategies[keys[0]];
  }
} 