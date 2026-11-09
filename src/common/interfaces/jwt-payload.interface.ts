import { Roles } from "../enums/user-roles.enum";

export interface JwtPayload {
    sub: string;
    email: string;
    roles: Roles[];
}

declare global {
    namespace Express {
        interface Request {
            /**
             * Payload del JWT verificado por `AuthMiddleware`.
             * Disponible solo en rutas protegidas (`Bearer <token>`).
             */
            user?: JwtPayload;
        }
    }
}
