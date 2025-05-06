import Router from "koa-router";

import userRouter from "./userRouter";
import authRouter from "./authRouter";

const router = new Router();

router.use(userRouter.routes(), userRouter.allowedMethods());
router.use(authRouter.routes(), authRouter.allowedMethods());

export default router;