import Koa from "koa";
import bodyParser from "koa-bodyparser";

import Router from "./router";
import ErrorMiddleware from "./middlewares/errorMiddleware";
import AuthMiddleware from "./middlewares/authMiddleware";

const app = new Koa();

app.use(bodyParser());

app.use(AuthMiddleware);
app.use(ErrorMiddleware);

app.use(Router.routes()).use(Router.allowedMethods());

export default app;