// --- Mocks must come first ---

const mockOrderWithSlot = {
  id: 1,
  userId: 1,
  totalAmount: 100,
  status: "pending",
  deliverySlot: {
    id: 1,
    startTime: new Date("2023-11-26T18:00:00"), // Sunday 6 PM
    endTime: new Date("2023-11-26T21:00:00"), // Sunday 9 PM
    maxCapacity: 10,
    currentUsage: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};
const mockOrderWithoutSlot = {
  id: 2,
  userId: 1,
  totalAmount: 100,
  status: "pending",
  deliverySlot: null,
};

const mockNotificationRepo = {
  save: jest
    .fn()
    .mockImplementation((notification) => ({ ...notification, id: 1 })),
};

const mockDataSource = {
  getRepository: jest.fn().mockImplementation((entity: any) => {
    if (entity.name === "Order") {
      return {
        findOne: jest.fn().mockResolvedValue(mockOrderWithSlot),
      };
    } else if (entity.name === "Notification") {
      return mockNotificationRepo;
    }
  }),
};

const mockPubsub = {
  publish: jest.fn(),
};

jest.mock("../models/typeorm", () => ({
  __esModule: true,
  default: {
    initialize: jest.fn().mockResolvedValue(mockDataSource),
  },
}));
jest.mock("../services/notification/pubsub", () => ({
  pubsub: mockPubsub,
}));

// --- Imports ---
import { describe, it, expect, beforeEach } from "@jest/globals";
import { notifyUser } from "../services/notification/notifyUser";
import { pubsub } from "../services/notification/pubsub";

// --- Tests ---
describe("Notification Service (NEW) Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock to order with slot
    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === "Order") {
        return {
          findOne: jest.fn().mockResolvedValue(mockOrderWithSlot),
        };
      } else if (entity.name === "Notification") {
        return mockNotificationRepo;
      }
    });
    mockNotificationRepo.save.mockImplementation((notification) => ({
      ...notification,
      id: 1,
    }));
  });

  it("should create order notification with delivery slot info", async () => {
    const notification = await notifyUser(1, "order_created", 1);
    expect(notification).toBeDefined();
    expect(notification.type).toBe("order_created");
    expect(notification.orderId).toBe(1);
    expect(notification.userId).toBe(1);
    expect(notification.content).toContain("Sunday");
    expect(notification.content).toContain("6:00 PM - 9:00 PM");
    expect(pubsub.publish).toHaveBeenCalledTimes(1);
    expect(pubsub.publish).toHaveBeenCalledWith(
      "user:notification",
      expect.objectContaining({ userId: 1, orderId: 1, type: "order_created" })
    );
  });

  it("should handle order without delivery slot", async () => {
    // Override the mock for this test to return an order without a delivery slot
    mockDataSource.getRepository.mockImplementation((entity: any) => {
      if (entity.name === "Order") {
        return {
          findOne: jest.fn().mockResolvedValue(mockOrderWithoutSlot),
        };
      } else if (entity.name === "Notification") {
        return {
          save: jest
            .fn()
            .mockImplementation((notification) => ({ ...notification, id: 2 })),
        };
      }
    });
    const notification = await notifyUser(2, "order_created", 1);
    expect(notification).toBeDefined();
    expect(notification.content).toContain(
      "Delivery details will be provided soon"
    );
    expect(pubsub.publish).toHaveBeenCalledTimes(1);
  });

  it("should include custom data in notifications", async () => {
    const notification = await notifyUser(1, "order_cancelled", 1, {
      reason: "Out of stock",
    });
    expect(notification).toBeDefined();
    expect(notification.content).toContain("has been cancelled");
    expect(notification.content).toContain("Out of stock");
  });
});
