import Router from "koa-router";

import * as AuthController from "../controllers/authController";

const authRouter = new Router({ prefix: "/auth" });

authRouter.post("/login", AuthController.login);
authRouter.post("/register", AuthController.register);
authRouter.post("/logout", AuthController.logout);

export default authRouter;