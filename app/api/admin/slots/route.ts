import { NextResponse } from "next/server";
import AppDataSource from "@/models/typeorm";
import { DeliverySlot } from "@/models/entities/DeliverySlot";

export async function GET(request: Request) {
  try {
    // Extract query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const showInactive = url.searchParams.get("showInactive") === "true";

    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    const slotRepository = dataSource.getRepository(DeliverySlot);

    // Build query
    const queryBuilder = slotRepository.createQueryBuilder("slot");

    // Filter conditions
    if (!showInactive) {
      queryBuilder.where("slot.isActive = :active", { active: true });
    }

    if (startDate) {
      queryBuilder.andWhere("slot.startTime >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("slot.endTime <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    // Order by start time
    queryBuilder.orderBy("slot.startTime", "ASC");

    // Execute query
    const slots = await queryBuilder.getMany();

    // Transform slots for the response
    const slotDetails = slots.map((slot: DeliverySlot) => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      maxCapacity: slot.maxCapacity,
      currentUsage: slot.currentUsage,
      availableCapacity: slot.maxCapacity - slot.currentUsage,
      usagePercentage: Math.round((slot.currentUsage / slot.maxCapacity) * 100),
      isActive: slot.isActive,
      isFull: slot.currentUsage >= slot.maxCapacity,
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          totalCount: slots.length,
          slots: slotDetails,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error retrieving delivery slots:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
