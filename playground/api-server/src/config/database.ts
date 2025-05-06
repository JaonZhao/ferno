import { Sequelize } from "sequelize-typescript";

import { env } from "./env";
import UserModel from "../models/userModel";

export const sequelize = new Sequelize({
  database: env.db.database,
  username: env.db.user,
  password: env.db.password,
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  models: [UserModel],
});