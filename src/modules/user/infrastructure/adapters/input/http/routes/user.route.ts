import { Router } from "express";
import { Roles } from "../../../../../../../common/enums/user-roles.enum";
import { AuthMiddleware } from "../../../../../../../common/middlewares/auth.middleware";
import { UserController } from "../controllers/user.controller";

export class UserRoutes {
    constructor(
        private readonly userController: UserController,
        private readonly authMiddleware: AuthMiddleware,
    ) { }

    get routes(): Router {
        const router = Router();

        //* Público: registro directo y health-check del recurso
        router.post("/", this.userController.create);

        //* Autenticados
        router.get("/", this.authMiddleware.validate([Roles.ADMIN]), this.userController.findAll);
        router.get("/:id", this.authMiddleware.validate(), this.userController.findOne);
        router.patch("/:id", this.authMiddleware.validate(), this.userController.update);
        router.delete("/:id", this.authMiddleware.validate(), this.userController.remove);

        return router;
    }
}
