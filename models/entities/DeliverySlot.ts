import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import type { Order } from "./Order";

@Entity()
export class DeliverySlot {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "datetime" })
  startTime!: Date;

  @Column({ type: "datetime" })
  endTime!: Date;

  @Column()
  maxCapacity!: number;

  @Column({ default: 0 })
  currentUsage!: number;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  // Relations
  @OneToMany("Order", (order: any) => order.deliverySlot)
  orders!: Order[];
}
