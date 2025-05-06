import { Context, Next } from "koa";

import { verifyToken } from "../utils/jwt";

export default async function authMiddleware(ctx: Context, next: Next) {
  if(ctx.path === "/auth/login" || ctx.path === "/auth/logout") {
    await next();
    return;
  }

  const token = ctx.cookies.get("token");
  if (!token) {
    ctx.status = 401;
    ctx.body = { message: 'Token not provided' };
    return;
  }

  try {
    ctx.state.user = verifyToken(token);
    await next();
  } catch (error) {
    ctx.throw(401, 'Invalid token');
  }
}