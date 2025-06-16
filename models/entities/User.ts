import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import type { Order } from "./Order";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  phone!: string;

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
  @OneToMany("Order", (order: any) => order.user)
  orders!: Order[];
}
