import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export class UserRoutes {
    constructor(
        private readonly userController: UserController,
    ){}
    get routes(): Router{
        const router = Router();
        
        router.post("/", this.userController.create);
        router.get("/", this.userController.findAll);
        router.get("/:id", this.userController.findOne);
        router.patch("/:id", this.userController.update);
        router.delete("/:id", this.userController.remove);
        
        return router;
    }
}