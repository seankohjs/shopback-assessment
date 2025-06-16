import AppDataSource from "../../models/typeorm";
import { Order } from "../../models/entities/Order";
import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { notifyUser } from "../notification/notifyUser";
import { notifyAdmin } from "../notification/notifyAdmin";

/**
 * Process a refund for an order
 * Updates order status, releases delivery slot, and sends notifications
 */
export async function refundOrder(
  orderId: number,
  reason: string
): Promise<Order> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create repositories
  const orderRepository = dataSource.getRepository(Order);
  const slotRepository = dataSource.getRepository(DeliverySlot);

  // Begin transaction
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Get the order
    const order = await orderRepository.findOne({
      where: { id: orderId },
      relations: ["deliverySlot"],
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Check if order can be refunded (must not be in delivered, cancelled, or refunded state)
    const nonRefundableStates = ["delivered", "cancelled", "refunded"];
    if (nonRefundableStates.includes(order.status)) {
      throw new Error(`Cannot refund order in ${order.status} state`);
    }

    // Free up the delivery slot if applicable
    if (order.deliverySlotId && order.deliverySlot) {
      // Decrement usage count for the slot
      order.deliverySlot.currentUsage = Math.max(
        0,
        order.deliverySlot.currentUsage - 1
      );
      await slotRepository.save(order.deliverySlot);
    }

    // Update order status to refunded
    order.status = "refunded";
    order.notes = order.notes
      ? `${order.notes}\nRefund reason: ${reason}`
      : `Refund reason: ${reason}`;

    // Save the updated order
    const updatedOrder = await orderRepository.save(order);

    // Notify the user
    await notifyUser(orderId, "order_refunded", order.userId);

    // Notify admin about the refund
    await notifyAdmin("refund_processed", {
      orderId,
      reason,
      amount: order.totalAmount,
    });

    // Commit transaction
    await queryRunner.commitTransaction();

    return updatedOrder;
  } catch (error) {
    // Rollback in case of error
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // Release the query runner
    await queryRunner.release();
  }
}
