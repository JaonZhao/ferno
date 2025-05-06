import { Table, Column, Model, DataType, AllowNull } from "sequelize-typescript";

@Table
export default class User extends Model {
  @Column({ type: DataType.STRING, allowNull: false, unique: true})
  username!: string;

  @Column({ type: DataType.STRING, allowNull: false})
  password!: string;
}