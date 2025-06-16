import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import type { User } from "./User";
import type { Order } from "./Order";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ nullable: true })
  orderId!: number;

  @Column()
  type!: string;

  @Column()
  title!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  // Relations
  @ManyToOne("User")
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne("Order", { nullable: true })
  @JoinColumn({ name: "orderId" })
  order!: Order | null;
}
