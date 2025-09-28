import AppDataSource from "../../models/typeorm";
import { Order } from "../../models/entities/Order";
import { RiskAlert } from "../../models/entities/RiskAlert";
import { RiskType, riskRules, RISK_THRESHOLDS } from "./riskRules";
import { notifyAdmin } from "../notification/notifyAdmin";

/**
 * Evaluates the risk level of an order
 * @param orderId Order ID to evaluate
 * @param slotSelectionContext Optional context about slot selection for enhanced risk evaluation
 * @returns The created risk alert or null if no risk detected
 */
export async function evaluateOrderRisk(
  orderId: number,
  slotSelectionContext?: { wasSlotRequested?: boolean; requestedSlotId?: number; slotRequestFulfilled?: boolean }
): Promise<RiskAlert | null> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create repositories
  const orderRepository = dataSource.getRepository(Order);
  const riskAlertRepository = dataSource.getRepository(RiskAlert);

  try {
    // Get the order with related data
    const order = await orderRepository.findOne({
      where: { id: orderId },
      relations: ["user", "deliverySlot", "items"],
    });

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Evaluate each risk rule
    let highestScore = 0;
    let highestRiskType = "";
    let riskDetails: string[] = [];

    for (const rule of riskRules) {
      // Evaluate this rule for the order, passing slot selection context
      const { score, triggered, details } = await rule.evaluate(order, slotSelectionContext);

      if (triggered) {
        // Add to details
        riskDetails.push(`[${rule.name}] ${details}`);

        // Update highest score
        if (score > highestScore) {
          highestScore = score;
          highestRiskType = rule.name;
        }
      }
    }

    // If no risk detected, return null
    if (highestScore === 0) {
      return null;
    }

    // Determine overall risk status based on thresholds
    let riskStatus: string;
    if (highestScore >= RISK_THRESHOLDS.HIGH) {
      riskStatus = "high_risk";
    } else if (highestScore >= RISK_THRESHOLDS.MEDIUM) {
      riskStatus = "medium_risk";
    } else {
      riskStatus = "low_risk";
    }

    // Create risk alert
    const riskAlert = new RiskAlert();
    riskAlert.orderId = orderId;
    riskAlert.riskType = riskStatus;
    riskAlert.riskScore = highestScore;
    riskAlert.details = riskDetails.join("\n");
    riskAlert.status = "pending";

    // Save risk alert
    const savedAlert = await riskAlertRepository.save(riskAlert);

    // Notify admin for medium and high risk orders
    if (highestScore >= RISK_THRESHOLDS.MEDIUM) {
      await notifyAdmin("high_risk_order", {
        orderId,
        riskScore: highestScore,
        riskType: highestRiskType,
        details: riskDetails.join(", "),
      });
    }

    return savedAlert;
  } catch (error) {
    console.error(`Error evaluating risk for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Scans all recent orders for risk
 * @returns Count of risk alerts created
 */
export async function scanRecentOrders(): Promise<number> {
  // Initialize database connection
  const dataSource = await AppDataSource.initialize();

  // Create repository
  const orderRepository = dataSource.getRepository(Order);

  try {
    // Get orders created in the last 24 hours that haven't been evaluated yet
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const orders = await orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.deliverySlot", "deliverySlot")
      .leftJoinAndSelect("order.user", "user")
      .leftJoinAndSelect("order.items", "items")
      .where("order.createdAt >= :oneDayAgo", { oneDayAgo })
      .getMany();

    console.log(`Scanning ${orders.length} orders for risk...`);

    // Evaluate each order
    let alertCount = 0;

    for (const order of orders) {
      const alert = await evaluateOrderRisk(order.id);
      if (alert) {
        alertCount++;
      }
    }

    console.log(`Created ${alertCount} risk alerts`);
    return alertCount;
  } catch (error) {
    console.error("Error scanning recent orders:", error);
    throw error;
  }
}
