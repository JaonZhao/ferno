import { Context } from "koa";

import * as AuthService from "../services/authService"

export async function register(ctx: Context) {
  const { username, password } = ctx.request.body as { username: string; password: string };
  const user = await AuthService.register(username, password);
  ctx.body = { id: user.id, username: user.username };
}

export async function login(ctx: Context) {
  const { username, password} = ctx.request.body as { username: string; password: string };
  const { token } = await AuthService.login(username, password);

  ctx.cookies.set("token", token, {
    httpOnly: true,
    // secure: env.isProd,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  });

  ctx.body = { message: "Login successful" };
}

export async function logout(ctx: Context) {
  ctx.cookies.set("token", "", {
    httpOnly: true, 
    expires: new Date(0)
  });

  ctx.body = { message: "Successfully logged out." };
}