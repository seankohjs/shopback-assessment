import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { DeliverySlot } from "./DeliverySlot";
import type { OrderItem } from "./OrderItem";
import type { OrderStatus } from "../../types/schema";

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ nullable: true })
  deliverySlotId!: number | null;

  @Column()
  addressId!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({
    type: "varchar",
    default: "pending",
    enum: [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ],
  })
  status!: OrderStatus;

  @Column({ nullable: true })
  notes!: string;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  // Relations
  @ManyToOne("User", (user: any) => user.orders)
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne("DeliverySlot", (deliverySlot: any) => deliverySlot.orders, {
    nullable: true,
  })
  @JoinColumn({ name: "deliverySlotId" })
  deliverySlot!: DeliverySlot | null;

  @OneToMany("OrderItem", (orderItem: any) => orderItem.order)
  items!: OrderItem[];
}
