import { NextResponse } from "next/server";
import { validateOrderInput } from "@/utils/validators";
import { createOrder } from "@/services/order/createOrder";
import { IOrderInput } from "@/types/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validation = validateOrderInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }
    
    // Process the order creation
    try {
      const orderInput = body as IOrderInput;
      const result = await createOrder(orderInput);

      // Calculate slot assignment details
      const slotAssignment = {
        requested: orderInput.deliverySlotId || null,
        assigned: result.deliverySlotId,
        wasRequested: Boolean(orderInput.deliverySlotId),
        wasFallback: orderInput.deliverySlotId && orderInput.deliverySlotId !== result.deliverySlotId
      };

      return NextResponse.json(
        {
          success: true,
          message: "Order created successfully",
          data: {
            orderId: result.id,
            userId: result.userId,
            deliverySlotId: result.deliverySlotId,
            totalAmount: result.totalAmount,
            status: result.status,
            createdAt: result.createdAt,
            slotAssignment
          }
        },
        { status: 201 }
      );
    } catch (error: any) {
      // Handle specific errors from the order service
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 