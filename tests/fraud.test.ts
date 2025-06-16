// --- Mocks must come first ---

const mockDataSource = {
  getRepository: jest.fn().mockImplementation((entity: any) => {
    if (entity.name === "Order") {
      return {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          userId: 1,
          addressId: 100,
          totalAmount: 800,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          deliverySlot: {
            id: 1,
            startTime: new Date("2023-11-26T18:00:00"), // Sunday 6 PM
            endTime: new Date("2023-11-26T21:00:00"),
            maxCapacity: 10,
            currentUsage: 8,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          user: {
            id: 1,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
          items: [],
        }),
      };
    } else if (entity.name === "RiskAlert") {
      return {
        save: jest
          .fn()
          .mockImplementation((alert: any) => ({ ...alert, id: 1 })),
      };
    }
  }),
};

jest.mock("../models/typeorm", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(mockDataSource),
  },
}));
jest.mock("../services/notification/notifyAdmin", () => ({
  notifyAdmin: jest.fn().mockResolvedValue({}),
}));

// --- Imports ---
import { describe, it, expect } from "@jest/globals";
import {
  HighValueRule,
  WeekendDeliveryRule,
  PeakSlotRule,
} from "../services/fraud/riskRules";
import { evaluateOrderRisk } from "../services/fraud/scan";

// --- Helper ---
const createMockOrder = (overrides: any = {}) => ({
  id: 1,
  userId: 1,
  addressId: 100,
  totalAmount: 100,
  status: "pending",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// --- Tests ---
describe("Fraud Detection (NEW) Tests", () => {
  describe("Risk Rules", () => {
    it("should correctly evaluate high value orders", async () => {
      // High value
      const highValueOrder = createMockOrder({ totalAmount: 1200 });
      const result = await HighValueRule.evaluate(highValueOrder);
      expect(result.triggered).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.9);

      // Moderate value
      const moderateValueOrder = createMockOrder({ totalAmount: 600 });
      const moderateResult = await HighValueRule.evaluate(moderateValueOrder);
      expect(moderateResult.triggered).toBe(true);
      expect(moderateResult.score).toBeLessThan(0.9);

      // Low value
      const lowValueOrder = createMockOrder({ totalAmount: 100 });
      const lowResult = await HighValueRule.evaluate(lowValueOrder);
      expect(lowResult.triggered).toBe(false);
    });

    it("should correctly evaluate weekend delivery orders", async () => {
      // Weekend evening high-demand slot
      const weekendEveningOrder = createMockOrder({
        deliverySlot: {
          id: 1,
          startTime: new Date("2023-11-26T18:00:00"), // Sunday 6 PM
          endTime: new Date("2023-11-26T21:00:00"),
          maxCapacity: 10,
          currentUsage: 9,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const result = await WeekendDeliveryRule.evaluate(weekendEveningOrder);
      expect(result.triggered).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);

      // Weekday evening order
      const weekdayOrder = createMockOrder({
        deliverySlot: {
          id: 2,
          startTime: new Date("2023-11-22T18:00:00"), // Wednesday 6 PM
          endTime: new Date("2023-11-22T21:00:00"),
          maxCapacity: 10,
          currentUsage: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const weekdayResult = await WeekendDeliveryRule.evaluate(weekdayOrder);
      expect(weekdayResult.triggered).toBeFalsy();
    });

    it("should correctly evaluate high-demand peak slots", async () => {
      // Very high demand slot (90%+ capacity)
      const peakSlotOrder = createMockOrder({
        deliverySlot: {
          id: 3,
          startTime: new Date("2023-11-24T18:00:00"),
          endTime: new Date("2023-11-24T21:00:00"),
          maxCapacity: 10,
          currentUsage: 9,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const result = await PeakSlotRule.evaluate(peakSlotOrder);
      expect(result.triggered).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.7);

      // Medium demand slot
      const mediumDemandOrder = createMockOrder({
        deliverySlot: {
          id: 4,
          startTime: new Date("2023-11-24T12:00:00"),
          endTime: new Date("2023-11-24T15:00:00"),
          maxCapacity: 10,
          currentUsage: 7,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const mediumResult = await PeakSlotRule.evaluate(mediumDemandOrder);
      expect(mediumResult.triggered).toBeFalsy();
    });
  });

  describe("Order Risk Evaluation", () => {
    it("should create risk alert for high-risk orders", async () => {
      const result = await evaluateOrderRisk(1);
      expect(result).toBeDefined();
      expect(result?.riskType).toBe("medium_risk");
      expect(result?.riskScore).toBeGreaterThan(0.5);
      expect(result?.orderId).toBe(1);
    });
  });
});
