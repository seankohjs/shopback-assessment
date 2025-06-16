import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import path from "path";
import { User } from "./entities/User";
import { Order } from "./entities/Order";
import { OrderItem } from "./entities/OrderItem";
import { DeliverySlot } from "./entities/DeliverySlot";
import { Notification } from "./entities/Notification";
import { RiskAlert } from "./entities/RiskAlert";

// Load environment variables
config();

// Create TypeORM DataSource
const AppDataSource = new DataSource({
  type: "sqlite",
  database: process.env.DB_DATABASE || "./data/delivery-slot.sqlite",
  synchronize: process.env.DB_SYNCHRONIZE === "true",
  logging: process.env.DB_LOGGING === "true",
  entities: [User, Order, OrderItem, DeliverySlot, Notification, RiskAlert],
  migrations: [path.join(__dirname, "../migrations/*.ts")],
  subscribers: [],
});

// Default export for TypeORM CLI
export default AppDataSource;
