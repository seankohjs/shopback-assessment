// --- Mocks must come first ---

const mockValidateInventory = jest.fn();
const mockCalculatePrice = jest.fn();
const mockNotifyUser = jest.fn();
const mockAssignDefaultSlot = jest.fn();

const mockDataSource = {
  getRepository: jest.fn().mockImplementation((entity: any) => {
    if (entity.name === "Order") {
      return {
        save: jest
          .fn()
          .mockImplementation((order: any) => ({ ...order, id: 1 })),
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          userId: 1,
          addressId: 100,
          deliverySlotId: 4,
          totalAmount: 10,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
          deliverySlot: null,
        }),
      };
    } else if (entity.name === "OrderItem") {
      return {
        save: jest.fn().mockImplementation((items: any) => items),
      };
    } else if (entity.name === "DeliverySlot") {
      return {
        findOneBy: jest.fn().mockImplementation((query: any) => {
          if (query.id === 1) {
            return {
              id: 1,
              isActive: true,
              currentUsage: 5,
              maxCapacity: 10,
              startTime: new Date(),
              endTime: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          } else if (query.id === 2) {
            return {
              id: 2,
              isActive: true,
              currentUsage: 10,
              maxCapacity: 10,
              startTime: new Date(),
              endTime: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          } else if (query.id === 3) {
            return {
              id: 3,
              isActive: false,
              currentUsage: 0,
              maxCapacity: 10,
              startTime: new Date(),
              endTime: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
        save: jest.fn().mockImplementation((slot: any) => slot),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 4,
            isActive: true,
            currentUsage: 3,
            maxCapacity: 10,
            startTime: new Date(),
            endTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        }),
      };
    } else if (entity.name === "User") {
      return {
        findOneBy: jest.fn().mockResolvedValue({
          id: 1,
          name: "Test User",
          email: "test@example.com",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };
    }
  }),
  createQueryRunner: () => ({
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  }),
};

jest.mock("../models/typeorm", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(mockDataSource),
  },
}));
jest.mock("../services/order/validateInventory", () => ({
  validateInventory: mockValidateInventory,
}));
jest.mock("../services/order/calculatePrice", () => ({
  calculatePrice: mockCalculatePrice,
}));
jest.mock("../services/notification/notifyUser", () => ({
  notifyUser: mockNotifyUser,
}));
jest.mock("../services/delivery/assignDefaultSlot", () => ({
  assignDefaultSlot: mockAssignDefaultSlot,
}));

// --- Imports ---
import { describe, it, expect, beforeEach } from "@jest/globals";
import { validateOrderInput, isSlotAvailable } from "../utils/validators";
import { createOrder } from "../services/order/createOrder";

// --- Tests ---
describe("Delivery Slot (NEW) Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateInventory.mockResolvedValue({
      valid: true,
      errors: [],
      availableItems: { SKU001: 100 },
    });
    mockCalculatePrice.mockResolvedValue({
      itemPrices: { SKU001: 10 },
      itemDiscounts: { SKU001: 0 },
      subtotal: 10,
      totalDiscount: 0,
      totalAmount: 10,
    });
    mockNotifyUser.mockResolvedValue({
      id: 1,
      userId: 1,
      type: "order_created",
      title: "Order Confirmation",
      content: "Test notification",
      isRead: false,
      createdAt: new Date(),
    });
    mockAssignDefaultSlot.mockResolvedValue({
      id: 4,
      isActive: true,
      currentUsage: 3,
      maxCapacity: 10,
      startTime: new Date(),
      endTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe("Order Input Validation", () => {
    it("should validate a valid order input", () => {
      const input = {
        userId: 1,
        addressId: 100,
        items: [{ skuId: "SKU001", qty: 2 }],
      };
      const result = validateOrderInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Slot Availability Check", () => {
    it("should return true for an available slot", () => {
      const slot = {
        id: 1,
        isActive: true,
        currentUsage: 5,
        maxCapacity: 10,
      };
      expect(isSlotAvailable(slot)).toBe(true);
    });
    it("should return false for a full slot", () => {
      const slot = {
        id: 2,
        isActive: true,
        currentUsage: 10,
        maxCapacity: 10,
      };
      expect(isSlotAvailable(slot)).toBe(false);
    });
    it("should return false for an inactive slot", () => {
      const slot = {
        id: 3,
        isActive: false,
        currentUsage: 5,
        maxCapacity: 10,
      };
      expect(isSlotAvailable(slot)).toBe(false);
    });
  });

  describe("Order Creation with Slots", () => {
    it("should create an order with default slot assignment", async () => {
      const input = {
        userId: 1,
        addressId: 100,
        items: [{ skuId: "SKU001", qty: 2 }],
      };
      const result = await createOrder(input);
      expect(result).toBeDefined();
      expect(result.deliverySlotId).toBe(4);
    });
  });
});
