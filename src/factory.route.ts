import { Router } from "express";
import { UserRoutes } from "./modules/user/infrastructure/adapters/input/http/routes/user.route";
import { AuthRoutes } from "./modules/auth/infrastructure/adapters/input/http/routes/auth.route";

export class FactoryRoutes {
    constructor(
        private readonly userRoutes: UserRoutes,
        private readonly authRoutes: AuthRoutes,
    ){}

    get routes(): Router{
        const router = Router()

        router.use("/users", this.userRoutes.routes);
        router.use("/auth", this.authRoutes.routes);

        return router;
    }
}