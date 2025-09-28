import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { Order } from "../../models/entities/Order";
import { OrderItem } from "../../models/entities/OrderItem";
import { User } from "../../models/entities/User";
import AppDataSource from "../../models/typeorm";
import { IOrderInput, IOrderItemInput } from "../../types/schema";
import { assignDefaultSlot } from "../delivery/assignDefaultSlot";
import { notifyUser } from "../notification/notifyUser";
import { calculatePrice } from "./calculatePrice";
import { validateInventory } from "./validateInventory";
import { validateSlotSelection } from "../delivery/validateSlotSelection";
import { incrementSlotUsage } from "../delivery/updateSlotUsage";
import { evaluateOrderRisk } from "../fraud/scan";

/**
 * Creates a new order with the provided details
 * Handles the complete order creation flow including:
 * - Inventory validation
 * - Price calculation
 * - Delivery slot assignment
 * - Order and order items saving
 * - User notification
 */
export async function createOrder(orderInput: IOrderInput): Promise<Order> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create repositories
  const orderRepository = dataSource.getRepository(Order);
  const orderItemRepository = dataSource.getRepository(OrderItem);
  const userRepository = dataSource.getRepository(User);
  const slotRepository = dataSource.getRepository(DeliverySlot);

  try {
    // Begin transaction
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Validate inventory
      const inventoryValidation = await validateInventory(orderInput.items);
      if (!inventoryValidation.valid) {
        throw new Error(
          `Inventory validation failed: ${inventoryValidation.errors.join(
            ", "
          )}`
        );
      }

      // Step 2: Check if user exists
      const user = await userRepository.findOneBy({ id: orderInput.userId });
      if (!user) {
        throw new Error(`User with ID ${orderInput.userId} not found`);
      }

      // Step 3: Calculate price
      const priceDetails = await calculatePrice(orderInput.items);

      // Step 4: Assign delivery slot
      let deliverySlot: DeliverySlot | null = null;
      let deliverySlotId: number | null = null;
      let wasRequestedSlotUsed = false;

      if (orderInput.deliverySlotId) {
        // User selected a slot - validate it
        const validation = await validateSlotSelection(orderInput.deliverySlotId);
        if (validation.isValid && validation.slot) {
          // Use the requested slot
          deliverySlot = validation.slot;
          deliverySlotId = deliverySlot.id;
          wasRequestedSlotUsed = true;

          // Increment slot usage within the transaction
          await incrementSlotUsage(deliverySlot.id, queryRunner);
        } else {
          // Fallback to automatic assignment
          console.log(`Fallback to automatic assignment for order. Reason: ${validation.reason}`);
          deliverySlot = await assignDefaultSlot();
          if (deliverySlot) {
            deliverySlotId = deliverySlot.id;
          }
        }
      } else {
        // No selection - use automatic assignment (existing behavior)
        deliverySlot = await assignDefaultSlot();
        if (deliverySlot) {
          deliverySlotId = deliverySlot.id;
        }
      }

      // Step 5: Create order
      const newOrder = new Order();
      newOrder.userId = orderInput.userId;
      newOrder.addressId = orderInput.addressId;
      newOrder.deliverySlotId = deliverySlotId;
      newOrder.totalAmount = priceDetails.totalAmount;
      newOrder.status = "pending";

      // Save order to get ID
      const savedOrder = await orderRepository.save(newOrder);

      // Step 6: Create order items
      const orderItems = orderInput.items.map((item: IOrderItemInput) => {
        const orderItem = new OrderItem();
        orderItem.orderId = savedOrder.id;
        orderItem.skuId = item.skuId;
        orderItem.quantity = item.qty;
        orderItem.unitPrice = priceDetails.itemPrices[item.skuId] || 0;
        orderItem.discount = priceDetails.itemDiscounts[item.skuId] || 0;
        orderItem.subtotal =
          (orderItem.unitPrice - orderItem.discount) * orderItem.quantity;
        return orderItem;
      });

      // Save all order items
      await orderItemRepository.save(orderItems);

      // Step 7: Notify user about order creation
      const notificationData: Record<string, any> = {};

      // Add slot selection context for notification
      if (orderInput.deliverySlotId) {
        notificationData.slotWasRequested = true;
        notificationData.requestedSlotId = orderInput.deliverySlotId;
        notificationData.slotRequestFulfilled = wasRequestedSlotUsed;
        if (!wasRequestedSlotUsed) {
          notificationData.fallbackReason = "Requested slot was not available";
        }
      }

      await notifyUser(savedOrder.id, "order_created", user.id, notificationData);

      // Step 8: Evaluate order for fraud risk
      // Note: This runs after order creation but before transaction commit
      // so that risk evaluation has access to the complete order data
      try {
        // Prepare slot selection context for enhanced fraud detection
        const slotSelectionContext = orderInput.deliverySlotId ? {
          wasSlotRequested: true,
          requestedSlotId: orderInput.deliverySlotId,
          slotRequestFulfilled: wasRequestedSlotUsed
        } : undefined;

        await evaluateOrderRisk(savedOrder.id, slotSelectionContext);
      } catch (riskError) {
        // Log risk evaluation errors but don't fail the order
        console.error(`Risk evaluation failed for order ${savedOrder.id}:`, riskError);
      }

      // Commit transaction
      await queryRunner.commitTransaction();

      // Return the complete order with items
      const completeOrder = await orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ["items", "deliverySlot", "user"],
      });

      if (!completeOrder) {
        throw new Error(
          `Failed to retrieve the created order with ID ${savedOrder.id}`
        );
      }

      return completeOrder;
    } catch (error) {
      // Rollback transaction in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  } catch (error) {
    // Re-throw the error for handling by the API layer
    throw error;
  }
}
