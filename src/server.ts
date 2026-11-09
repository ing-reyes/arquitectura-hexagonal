import cors from "cors";
import express, { Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { Server } from "http";
import { Handler } from "./common/errors/handler.error";
import { ManagerError } from "./common/errors/manager.error";
import { FactoryRoutes } from "./factory.route";

export class AppServer {
    private readonly app: Express = express();
    private readonly handlerError = new Handler();

    constructor(
        private readonly factoryRoutes: FactoryRoutes,
    ) { }

    private middlewares() {
        //* Security headers
        this.app.use(helmet());

        //* CORS (restringible con CORS_ORIGIN)
        this.app.use(cors());

        //* Global rate limit
        this.app.use(rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 300,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (_req, res) => {
                this.handlerError.error(
                    ManagerError.tooManyRequests("Too many requests, please try again later"),
                    res,
                );
            },
        }));

        //* Body parsers
        this.app.use(express.json({ limit: "100kb" }));
        this.app.use(express.urlencoded({ extended: true }));
    }

    start(port: number): Server {
        //* Middlewares Globals
        this.middlewares();

        //* Routes Globals
        this.app.use(this.factoryRoutes.routes);

        //* Listening Ports
        return this.app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    }
}
