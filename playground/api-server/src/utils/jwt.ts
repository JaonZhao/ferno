import jwt from "jsonwebtoken";

import { env } from "../config/env";

export function generateToken(payload: object) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "1h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret);
}