import Router from "koa-router";

import * as userController from "../controllers/userController";

const userRouter = new Router({ prefix: "/users"});

userRouter.post("/", userController.getAllUsers);
userRouter.post("/:id", userController.getUserById);

export default userRouter;