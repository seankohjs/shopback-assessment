import { NextResponse } from "next/server";
import AppDataSource from "@/models/typeorm";
import { Order } from "@/models/entities/Order";
import { OrderItem } from "@/models/entities/OrderItem";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { success: false, message: "Valid order ID is required" },
        { status: 400 }
      );
    }

    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    const orderRepository = dataSource.getRepository(Order);

    // Find the order with related entities
    const order = await orderRepository.findOne({
      where: { id: Number(id) },
      relations: ["deliverySlot", "items"],
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: order.id,
          userId: order.userId,
          addressId: order.addressId,
          deliverySlot: order.deliverySlot
            ? {
                id: order.deliverySlot.id,
                startTime: order.deliverySlot.startTime,
                endTime: order.deliverySlot.endTime,
              }
            : null,
          totalAmount: order.totalAmount,
          status: order.status,
          items: order.items
            ? order.items.map((item: OrderItem) => ({
                id: item.id,
                skuId: item.skuId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                subtotal: item.subtotal,
              }))
            : [],
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error retrieving order ${params.id}:`, error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
