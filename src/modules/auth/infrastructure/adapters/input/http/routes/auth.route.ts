import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

export class AuthRoutes {
    constructor(
        private readonly authController: AuthController
    ){}

    get routes(): Router{
        const router = Router();
        router.post("/sign-in", this.authController.signIn);
        router.post("/sign-up", this.authController.signUp);
        return router;
    }
}