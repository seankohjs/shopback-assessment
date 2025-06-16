import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import type { Order } from "./Order";

@Entity()
export class RiskAlert {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  orderId!: number;

  @Column()
  riskType!: string;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  riskScore!: number;

  @Column({ type: "text", nullable: true })
  details!: string;

  @Column({
    type: "varchar",
    default: "pending",
    enum: ["pending", "reviewed", "cleared", "flagged"],
  })
  status!: string;

  @Column({ nullable: true })
  reviewedBy!: string;

  @Column({ type: "datetime", nullable: true })
  reviewedAt!: Date;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  // Relations
  @ManyToOne("Order")
  @JoinColumn({ name: "orderId" })
  order!: Order;
}
