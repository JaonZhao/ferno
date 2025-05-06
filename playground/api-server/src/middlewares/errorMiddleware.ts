import { Context, Next } from "koa";

export default async function errorMiddleware(ctx: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    ctx.status = error.status || 500;
    ctx.body = {
      message: error.message || 'Internal Server Error',
    }
  }
}