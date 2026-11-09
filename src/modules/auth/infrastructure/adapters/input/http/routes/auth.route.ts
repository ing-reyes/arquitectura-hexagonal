import { Router } from "express";
import rateLimit from "express-rate-limit";
import { Handler } from "../../../../../../../common/errors/handler.error";
import { ManagerError } from "../../../../../../../common/errors/manager.error";
import { AuthController } from "../controllers/auth.controller";

export class AuthRoutes {
    private readonly handlerError = new Handler();

    constructor(
        private readonly authController: AuthController
    ) { }

    get routes(): Router {
        const router = Router();

        //* Endpoints de credenciales: cupo más restrictivo que el global
        const credentialsLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 10,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (_req, res) => {
                this.handlerError.error(
                    ManagerError.tooManyRequests("Too many authentication attempts, try again later"),
                    res,
                );
            },
        });

        router.post("/sign-in", credentialsLimiter, this.authController.signIn);
        router.post("/sign-up", credentialsLimiter, this.authController.signUp);

        return router;
    }
}
