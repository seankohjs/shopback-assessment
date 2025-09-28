import AppDataSource from "../../models/typeorm";
import { Notification } from "../../models/entities/Notification";
import { Order } from "../../models/entities/Order";
import { DeliverySlot } from "../../models/entities/DeliverySlot";
import { pubsub } from "./pubsub";

// Message templates for different notification types
const NOTIFICATION_TEMPLATES: Record<
  string,
  { title: string; template: string }
> = {
  order_created: {
    title: "Order Confirmation",
    template:
      "Your order #{orderId} has been received and is being processed. {deliveryInfo}{slotInfo}",
  },
  order_confirmed: {
    title: "Order Confirmed",
    template:
      "Good news! Your order #{orderId} has been confirmed. {deliveryInfo}",
  },
  order_shipped: {
    title: "Order Shipped",
    template: "Your order #{orderId} is on its way to you! {deliveryInfo}",
  },
  order_delivered: {
    title: "Order Delivered",
    template: "Your order #{orderId} has been delivered. Enjoy!",
  },
  order_cancelled: {
    title: "Order Cancelled",
    template: "Your order #{orderId} has been cancelled. {reason}",
  },
  order_refunded: {
    title: "Order Refunded",
    template: "Your refund for order #{orderId} has been processed. {reason}",
  },
};

/**
 * Generate slot selection information for notifications
 */
function formatSlotSelectionInfo(additionalData: Record<string, any>): string {
  if (!additionalData.slotWasRequested) {
    return "";
  }

  if (additionalData.slotRequestFulfilled) {
    return " Your requested delivery time has been confirmed.";
  } else {
    const reason = additionalData.fallbackReason || "Requested slot was not available";
    return ` Note: ${reason}. We've assigned you the next best available time slot.`;
  }
}

/**
 * Format a delivery slot into a human-readable string
 */
async function formatDeliveryTime(orderId: number): Promise<string> {
  const dataSource = await AppDataSource.initialize();
  const orderRepository = dataSource.getRepository(Order);

  const order = await orderRepository.findOne({
    where: { id: orderId },
    relations: ["deliverySlot"],
  });

  if (!order || !order.deliverySlot) {
    return "Delivery details will be provided soon.";
  }

  const slot = order.deliverySlot;
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);

  // Format day name
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = dayNames[startTime.getDay()];

  // Format time (e.g., "2:00 PM - 5:00 PM")
  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // convert 0 to 12
    return `${hours}:00 ${ampm}`;
  };

  return `Scheduled for ${dayName} ${formatTime(startTime)} - ${formatTime(
    endTime
  )}`;
}

/**
 * Sends a notification to a user about an order
 * @param orderId Order ID
 * @param type Notification type (order_created, order_confirmed, order_shipped, etc.)
 * @param userId User ID
 * @param additionalData Additional data for the notification message
 */
export async function notifyUser(
  orderId: number,
  type: string,
  userId: number,
  additionalData: Record<string, any> = {}
): Promise<Notification> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create notification repository
  const notificationRepository = dataSource.getRepository(Notification);

  try {
    // Get the notification template
    const template = NOTIFICATION_TEMPLATES[type];

    if (!template) {
      throw new Error(`Notification template for type '${type}' not found`);
    }

    // Get delivery information
    const deliveryInfo = await formatDeliveryTime(orderId);

    // Get slot selection information
    const slotInfo = formatSlotSelectionInfo(additionalData);

    // Prepare data for message interpolation
    const messageData = {
      orderId,
      deliveryInfo,
      slotInfo,
      ...additionalData,
    };

    // Generate notification content
    let content = template.template;

    // Replace placeholders in the template
    for (const [key, value] of Object.entries(messageData)) {
      content = content.replace(`{${key}}`, value.toString());
    }

    // Create notification record
    const notification = new Notification();
    notification.userId = userId;
    notification.orderId = orderId;
    notification.type = type;
    notification.title = template.title;
    notification.content = content;
    notification.isRead = false;

    // Save notification
    const savedNotification = await notificationRepository.save(notification);

    // Publish notification to pubsub for external delivery (email, push, etc.)
    pubsub.publish("user:notification", {
      userId,
      orderId,
      type,
      title: template.title,
      content,
      notificationId: savedNotification.id,
    });

    return savedNotification;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    throw error;
  }
}
