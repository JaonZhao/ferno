import { Context } from "koa";

export function getAllUsers(ctx: Context) {
  ctx.body = { message: "1111"}
  ctx.status = 200;
}

export function getUserById(ctx: Context) {
  ctx.body = { message: "200"}
  ctx.status = 200;
}