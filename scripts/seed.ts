import "reflect-metadata";
import { DeliverySlot } from "../models/entities/DeliverySlot";
import { Order } from "../models/entities/Order";
import { OrderItem } from "../models/entities/OrderItem";
import { User } from "../models/entities/User";
import AppDataSource from "../models/typeorm";

/**
 * Seed database with initial data
 */
async function seed() {
  console.log("Starting database seed...");

  try {
    // Initialize database connection
    const dataSource = await AppDataSource.initialize();
    console.log("Database connection initialized");

    // Create repositories
    const userRepository = dataSource.getRepository(User);
    const slotRepository = dataSource.getRepository(DeliverySlot);
    const orderRepository = dataSource.getRepository(Order);
    const orderItemRepository = dataSource.getRepository(OrderItem);

    // Seed Users
    console.log("Seeding users...");
    const users = await seedUsers(userRepository);

    // Seed Delivery Slots
    console.log("Seeding delivery slots...");
    const slots = await seedDeliverySlots(slotRepository);

    // Seed Orders
    console.log("Seeding orders...");
    const orders = await seedOrders(
      orderRepository,
      slotRepository,
      users,
      slots
    );

    // Seed Order Items
    console.log("Seeding order items...");
    await seedOrderItems(orderItemRepository, orders);

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

/**
 * Seed Users
 */
async function seedUsers(userRepository: any) {
  const users = [
    {
      email: "user1@example.com",
      name: "Regular User",
      phone: "555-1234",
    },
    {
      email: "admin@example.com",
      name: "Admin User",
      phone: "555-5678",
    },
    {
      email: "newuser@example.com",
      name: "New User",
      phone: "555-9012",
    },
  ];

  // Check if users already exist
  const existingUsers = await userRepository.find();
  if (existingUsers.length > 0) {
    console.log(
      `Found ${existingUsers.length} existing users, skipping user seed`
    );
    return existingUsers;
  }

  // Create users
  const createdUsers = [];

  for (const userData of users) {
    const user = new User();
    user.email = userData.email;
    user.name = userData.name;
    user.phone = userData.phone;

    const savedUser = await userRepository.save(user);
    createdUsers.push(savedUser);
  }

  console.log(`Created ${createdUsers.length} users`);
  return createdUsers;
}

/**
 * Seed Delivery Slots for the next 7 days
 */
async function seedDeliverySlots(slotRepository: any) {
  // Check if slots already exist
  const existingSlots = await slotRepository.find();
  if (existingSlots.length > 0) {
    console.log(
      `Found ${existingSlots.length} existing delivery slots, skipping slot seed`
    );
    return existingSlots;
  }

  const slots = [];
  const now = new Date();

  // Create slots for next 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    // Reset hours
    date.setHours(0, 0, 0, 0);

    // Create different time slots for each day
    const timeSlots = [
      { start: 9, end: 12, capacity: 10 }, // Morning: 9AM - 12PM
      { start: 12, end: 15, capacity: 15 }, // Afternoon: 12PM - 3PM
      { start: 15, end: 18, capacity: 15 }, // Late Afternoon: 3PM - 6PM
      { start: 18, end: 21, capacity: 8 }, // Evening: 6PM - 9PM
    ];

    for (const timeSlot of timeSlots) {
      const startTime = new Date(date);
      startTime.setHours(timeSlot.start, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(timeSlot.end, 0, 0, 0);

      // Create slot
      const slot = new DeliverySlot();
      slot.startTime = startTime;
      slot.endTime = endTime;
      slot.maxCapacity = timeSlot.capacity;
      slot.currentUsage = 0;
      slot.isActive = true;

      const savedSlot = await slotRepository.save(slot);
      slots.push(savedSlot);
    }
  }

  console.log(`Created ${slots.length} delivery slots`);
  return slots;
}

/**
 * Seed Orders
 */
async function seedOrders(
  orderRepository: any,
  slotRepository: any,
  users: User[],
  slots: DeliverySlot[]
) {
  // Check if orders already exist
  const existingOrders = await orderRepository.find();
  if (existingOrders.length > 0) {
    console.log(
      `Found ${existingOrders.length} existing orders, skipping order seed`
    );
    return existingOrders;
  }

  // Sample order data
  const orderData = [
    {
      userId: 1,
      deliverySlotId: 1,
      addressId: 101,
      totalAmount: 75.99,
      status: "confirmed",
    },
    {
      userId: 1,
      deliverySlotId: 5,
      addressId: 101,
      totalAmount: 120.5,
      status: "pending",
    },
    {
      userId: 2,
      deliverySlotId: 10,
      addressId: 202,
      totalAmount: 45.75,
      status: "delivered",
    },
    {
      userId: 3,
      addressId: 303,
      totalAmount: 250.0,
      status: "pending",
    },
  ];

  const orders = [];

  for (const data of orderData) {
    const order = new Order();
    order.userId = data.userId;
    order.deliverySlotId = data.deliverySlotId!;
    order.addressId = data.addressId;
    order.totalAmount = data.totalAmount;
    order.status = data.status;

    const savedOrder = await orderRepository.save(order);
    orders.push(savedOrder);

    // Update slot usage if slot is assigned
    if (data.deliverySlotId) {
      const slot = slots.find((s) => s.id === data.deliverySlotId);
      if (slot) {
        slot.currentUsage += 1;
        await slotRepository.save(slot);
      }
    }
  }
  console.log(`Created ${orders.length} orders`);
  return orders;
}

/**
 * Seed Order Items
 */
async function seedOrderItems(orderItemRepository: any, orders: Order[]) {
  // Check if order items already exist
  const existingItems = await orderItemRepository.find();
  if (existingItems.length > 0) {
    console.log(
      `Found ${existingItems.length} existing order items, skipping item seed`
    );
    return;
  }

  // Sample products
  const products = [
    { skuId: "SKU001", name: "Product 1", price: 10.99 },
    { skuId: "SKU002", name: "Product 2", price: 25.5 },
    { skuId: "SKU003", name: "Product 3", price: 5.99 },
    { skuId: "SKU004", name: "Product 4", price: 18.75 },
    { skuId: "SKU005", name: "Product 5", price: 32.99 },
  ];

  const orderItems = [];

  // Create 2-3 items for each order
  for (const order of orders) {
    // Randomly select 2-3 products
    const numItems = Math.floor(Math.random() * 2) + 2; // 2-3 items
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, numItems);

    for (const product of selectedProducts) {
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

      const orderItem = new OrderItem();
      orderItem.orderId = order.id;
      orderItem.skuId = product.skuId;
      orderItem.quantity = quantity;
      orderItem.unitPrice = product.price;
      orderItem.discount = 0; // No discount for seed data
      orderItem.subtotal = product.price * quantity;

      const savedItem = await orderItemRepository.save(orderItem);
      orderItems.push(savedItem);
    }
  }

  console.log(`Created ${orderItems.length} order items`);
}

// Run the seed function
seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
