import { IOrder, IOrderItem } from "../../types/schema";
import { DeliverySlot } from "../../models/entities/DeliverySlot";

// Risk score thresholds
export const RISK_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.7,
  HIGH: 0.9
};

// Risk types
export enum RiskType {
  HIGH_VALUE = 'high_value',
  WEEKEND_DELIVERY = 'weekend_delivery',
  MULTIPLE_ADDRESSES = 'multiple_addresses',
  RAPID_ORDERS = 'rapid_orders',
  NEW_ACCOUNT = 'new_account',
  PEAK_SLOT = 'peak_slot'
}

// Risk rule interface
export interface RiskRule {
  name: string;
  description: string;
  evaluate: (order: IOrder, additionalData?: any) => Promise<{ score: number; triggered: boolean; details?: string }>;
}

/**
 * High Value Order Rule
 * Checks if an order's total amount exceeds certain thresholds
 */
export const HighValueRule: RiskRule = {
  name: 'High Value Order',
  description: 'Detects unusually high value orders',
  
  async evaluate(order: IOrder): Promise<{ score: number; triggered: boolean; details?: string }> {
    const thresholds = {
      suspicious: 500, // $500+
      risky: 1000      // $1000+
    };
    
    let score = 0;
    let triggered = false;
    let details = '';
    
    if (order.totalAmount >= thresholds.risky) {
      score = 0.9; // High risk
      triggered = true;
      details = `Order amount $${order.totalAmount} exceeds high risk threshold of $${thresholds.risky}`;
    } else if (order.totalAmount >= thresholds.suspicious) {
      score = 0.6; // Medium risk
      triggered = true;
      details = `Order amount $${order.totalAmount} exceeds suspicious threshold of $${thresholds.suspicious}`;
    }
    
    return { score, triggered, details };
  }
};

/**
 * Weekend Delivery Rule
 * Checks if delivery is scheduled for weekend evenings which may have higher risk
 */
export const WeekendDeliveryRule: RiskRule = {
  name: 'Weekend Delivery',
  description: 'Detects orders with weekend evening delivery slots which may have higher risk',
  
  async evaluate(order: IOrder, slot?: DeliverySlot): Promise<{ score: number; triggered: boolean; details?: string }> {
    // If no slot provided or no delivery slot assigned
    if (!slot && !order.deliverySlot) {
      return { score: 0, triggered: false };
    }
    
    // Use provided slot or order's slot
    const deliverySlot = slot || order.deliverySlot;
    
    // Get start time of delivery
    const startTime = new Date(deliverySlot!.startTime);
    
    // Check if weekend (0 = Sunday, 6 = Saturday)
    const isWeekend = [0, 6].includes(startTime.getDay());
    
    // Check if evening delivery (after 6 PM)
    const isEvening = startTime.getHours() >= 18;
    
    // Check if slot is nearly full (high demand)
    const isHighDemandSlot = deliverySlot!.currentUsage >= (deliverySlot!.maxCapacity * 0.8);
    
    let score = 0;
    let triggered = false;
    let details = '';
    
    // Combine factors to determine risk
    if (isWeekend && isEvening && isHighDemandSlot) {
      score = 0.8; // High risk - weekend evening with high demand
      triggered = true;
      details = 'Order scheduled for weekend evening delivery in a high-demand slot';
    } else if (isWeekend && isEvening) {
      score = 0.6; // Medium-high risk for weekend evening deliveries
      triggered = true;
      details = 'Order scheduled for weekend evening delivery';
    } else if (isWeekend && isHighDemandSlot) {
      score = 0.5; // Medium risk for weekend high-demand slots
      triggered = true;
      details = 'Order scheduled for weekend delivery in a high-demand slot';
    } else if (isWeekend) {
      score = 0.3; // Low risk for normal weekend deliveries
      triggered = true;
      details = 'Order scheduled for weekend delivery';
    } else if (isEvening && isHighDemandSlot) {
      score = 0.4; // Low-medium risk for evening high-demand slots
      triggered = true;
      details = 'Order scheduled for evening delivery in a high-demand slot';
    }
    
    return { score, triggered, details };
  }
};

/**
 * Peak Slot Rule
 * Detects orders scheduled for high-demand slots
 */
export const PeakSlotRule: RiskRule = {
  name: 'Peak Slot',
  description: 'Detects orders scheduled for high-demand delivery slots',
  
  async evaluate(order: IOrder, slot?: DeliverySlot): Promise<{ score: number; triggered: boolean; details?: string }> {
    // If no slot provided or no delivery slot assigned
    if (!slot && !order.deliverySlot) {
      return { score: 0, triggered: false };
    }
    
    // Use provided slot or order's slot
    const deliverySlot = slot || order.deliverySlot;
    
    // Calculate usage percentage
    const usagePercentage = (deliverySlot!.currentUsage / deliverySlot!.maxCapacity) * 100;
    
    let score = 0;
    let triggered = false;
    let details = '';
    
    if (usagePercentage >= 90) {
      score = 0.7; // Medium-high risk for very high demand slots (90%+ capacity)
      triggered = true;
      details = `Order scheduled for extremely high-demand slot (${Math.round(usagePercentage)}% full)`;
    } else if (usagePercentage >= 75) {
      score = 0.4; // Medium-low risk for high demand slots (75-90% capacity)
      triggered = true;
      details = `Order scheduled for high-demand slot (${Math.round(usagePercentage)}% full)`;
    }
    
    return { score, triggered, details };
  }
};

/**
 * New Account Rule
 * Checks if the user account was created very recently
 */
export const NewAccountRule: RiskRule = {
  name: 'New Account',
  description: 'Detects orders placed from very new accounts',
  
  async evaluate(order: IOrder): Promise<{ score: number; triggered: boolean; details?: string }> {
    // Check if user information is available
    if (!order.user) {
      return { score: 0, triggered: false };
    }
    
    const userCreatedAt = new Date(order.user.createdAt);
    const now = new Date();
    
    // Calculate account age in hours
    const accountAgeHours = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60);
    
    let score = 0;
    let triggered = false;
    let details = '';
    
    if (accountAgeHours < 1) {
      score = 0.8; // High risk - account less than 1 hour old
      triggered = true;
      details = `New account created less than 1 hour ago`;
    } else if (accountAgeHours < 24) {
      score = 0.5; // Medium risk - account less than 1 day old
      triggered = true;
      details = `New account created ${Math.floor(accountAgeHours)} hours ago`;
    } else if (accountAgeHours < 72) {
      score = 0.2; // Low risk - account less than 3 days old
      triggered = true;
      details = `New account created less than 3 days ago`;
    }
    
    return { score, triggered, details };
  }
};

// Export all rules
export const riskRules: RiskRule[] = [
  HighValueRule,
  WeekendDeliveryRule,
  PeakSlotRule,
  NewAccountRule
]; 