import { NextResponse } from "next/server";
import AppDataSource from "@/models/typeorm";
import { RiskAlert } from "@/models/entities/RiskAlert";
import { scanRecentOrders } from "@/services/fraud/scan";

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const minScore = url.searchParams.get("minScore");

    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    const riskAlertRepository = dataSource.getRepository(RiskAlert);

    // Build query
    const queryBuilder = riskAlertRepository
      .createQueryBuilder("alert")
      .leftJoinAndSelect("alert.order", "order");

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere("alert.status = :status", { status });
    }

    // Filter by minimum risk score if provided
    if (minScore && !isNaN(Number(minScore))) {
      queryBuilder.andWhere("alert.riskScore >= :minScore", {
        minScore: Number(minScore),
      });
    }

    // Order by risk score (highest first) and creation date (newest first)
    queryBuilder
      .orderBy("alert.riskScore", "DESC")
      .addOrderBy("alert.createdAt", "DESC");

    // Execute query
    const alerts = await queryBuilder.getMany();

    // Transform alerts for the response
    const alertDetails = alerts.map((alert: RiskAlert) => ({
      id: alert.id,
      orderId: alert.orderId,
      riskType: alert.riskType,
      riskScore: alert.riskScore,
      details: alert.details,
      status: alert.status,
      reviewedBy: alert.reviewedBy,
      reviewedAt: alert.reviewedAt,
      createdAt: alert.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          totalCount: alerts.length,
          alerts: alertDetails,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error retrieving risk alerts:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint to trigger manual scanning of recent orders
export async function POST(request: Request) {
  try {
    // Trigger scan of recent orders
    const alertCount = await scanRecentOrders();

    return NextResponse.json(
      {
        success: true,
        message: `Scan completed. Created ${alertCount} risk alerts.`,
        data: { alertCount },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error scanning orders for risk:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
