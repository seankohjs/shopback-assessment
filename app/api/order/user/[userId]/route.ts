import { NextResponse } from "next/server";
import AppDataSource from "@/models/typeorm";
import { Order } from "@/models/entities/Order";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json(
        { success: false, message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    const orderRepository = dataSource.getRepository(Order);

    // Find all orders for the user
    const orders = await orderRepository.find({
      where: { userId: Number(userId) },
      relations: ["deliverySlot"],
      order: {
        createdAt: "DESC", // Most recent orders first
      },
    });

    // Transform orders to a more concise format for the response
    const orderSummaries = orders.map((order: Order) => ({
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      deliveryInfo: order.deliverySlot
        ? {
            id: order.deliverySlot.id,
            startTime: order.deliverySlot.startTime,
            endTime: order.deliverySlot.endTime,
          }
        : null,
      createdAt: order.createdAt,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: Number(userId),
          orderCount: orders.length,
          orders: orderSummaries,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error retrieving orders for user ${params.userId}:`, error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
