import UserModel from '../models/userModel';
// import { hasPassword } from "../utils/encrypt";
import { generateToken } from "../utils/jwt";

export async function register(username: string, password: string) {
  const existingUser = await UserModel.findOne({ where: { username} });
  if(existingUser) {
    throw new Error('Username already exists');
  }

  // const hashed = await hasPassword(password);
  // const user = await UserModel.create({ username, password: hashed });

  return null;
}

export async function login(username: string, password: string) {
  // const user = await UserModel.findOne({ where: { username } });
  // if(!user) {
  //   throw new Error('Invalid credentials');
  // }

  // const valid = await comparePassword(password, user.password);
  // if(!valid) {
  //   throw new Error("Invalid credentials");
  // }

  if(username !== "admin" || password !== "admin") {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({ id: "admin", username: "admin" });
  return { token };
}