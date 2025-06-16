import AppDataSource from "../../models/typeorm";
import { Notification } from "../../models/entities/Notification";
import { pubsub } from "./pubsub";

// Admin user ID (for demonstration purposes)
const ADMIN_USER_ID = 1;

// Message templates for different admin notification types
const ADMIN_NOTIFICATION_TEMPLATES: Record<
  string,
  { title: string; template: string }
> = {
  high_risk_order: {
    title: "High Risk Order Alert",
    template:
      "Order #{orderId} has been flagged as high risk (Score: {riskScore}). Reason: {riskType}",
  },
  refund_processed: {
    title: "Refund Processed",
    template:
      "A refund of ${amount} has been processed for order #{orderId}. Reason: {reason}",
  },
  slot_capacity_warning: {
    title: "Delivery Slot Capacity Warning",
    template:
      "Delivery slot '{slotId}' ({slotTime}) is near capacity ({currentUsage}/{maxCapacity})",
  },
  inventory_low: {
    title: "Low Inventory Alert",
    template:
      "Inventory for SKU {skuId} is running low. Current stock: {quantity}",
  },
};

/**
 * Sends a notification to the admin team
 * @param type Notification type (high_risk_order, refund_processed, etc.)
 * @param data Data for the notification message
 */
export async function notifyAdmin(
  type: string,
  data: Record<string, any>
): Promise<Notification> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create notification repository
  const notificationRepository = dataSource.getRepository(Notification);

  try {
    // Get the notification template
    const template = ADMIN_NOTIFICATION_TEMPLATES[type];

    if (!template) {
      throw new Error(
        `Admin notification template for type '${type}' not found`
      );
    }

    // Generate notification content
    let content = template.template;

    // Replace placeholders in the template
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(`{${key}}`, value.toString());
    }

    // Create notification record
    const notification = new Notification();
    notification.userId = ADMIN_USER_ID;
    notification.orderId = data.orderId; // May be undefined for some notification types
    notification.type = `admin:${type}`;
    notification.title = template.title;
    notification.content = content;
    notification.isRead = false;

    // Save notification
    const savedNotification = await notificationRepository.save(notification);

    // Publish notification to pubsub for external delivery (email, dashboard alert, etc.)
    pubsub.publish("admin:notification", {
      type,
      title: template.title,
      content,
      data,
      notificationId: savedNotification.id,
    });

    return savedNotification;
  } catch (error) {
    console.error(`Error sending admin notification:`, error);
    throw error;
  }
}
