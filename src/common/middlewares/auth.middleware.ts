import { NextFunction, Request, Response } from "express";
import { JwtConfig } from "../config/jwt.config";
import { Roles } from "../enums/user-roles.enum";
import { Handler } from "../errors/handler.error";
import { ManagerError } from "../errors/manager.error";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

export class AuthMiddleware {
    constructor(
        private readonly jwtConfig: JwtConfig,
        private readonly handlerError: Handler,
    ) { }

    /**
     * Devuelve un middleware que exige un header `Authorization: Bearer <token>`.
     * Si se indican roles, además valida que el payload contenga alguno de ellos.
     * En caso contrario responde 401/403 y NO continúa con el siguiente handler.
     */
    validate(allowedRoles: Roles[] = []) {
        return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            try {
                const [type, token] = (req.header("authorization") ?? "").split(" ");

                if (type?.toLowerCase() !== "bearer" || !token) {
                    this.handlerError.error(
                        ManagerError.unauthorized("Authorization header must be in the format: Bearer <token>"),
                        res,
                    );
                    return;
                }

                const payload = await this.jwtConfig.validateToken<JwtPayload>(token);

                if (!payload?.sub || !Array.isArray(payload.roles)) {
                    this.handlerError.error(ManagerError.unauthorized("Invalid or expired token"), res);
                    return;
                }

                if (allowedRoles.length > 0 && !payload.roles.some((role) => allowedRoles.includes(role))) {
                    this.handlerError.error(
                        ManagerError.forbiden(`Requires one of these roles: ${allowedRoles.join(", ")}`),
                        res,
                    );
                    return;
                }

                req.user = payload;
                next();
            } catch (error) {
                this.handlerError.error(error, res);
            }
        };
    }
}
