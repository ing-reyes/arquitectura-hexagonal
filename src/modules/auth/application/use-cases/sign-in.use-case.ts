import { JwtConfig } from "../../../../common/config/jwt.config";
import { ManagerError } from "../../../../common/errors/manager.error";
import { ApiOneResponse } from "../../../../common/interfaces/api-response.interface";
import { SignInCommand } from "../../domain/models/commands/sign-in.command";
import { AuthEmail } from "../../domain/models/value-objects/auth-email";
import { AuthPassword } from "../../domain/models/value-objects/auth-password";
import { AuthRepositoryPort } from "../../domain/ports/output/auth.repository";
import { SignInRequest } from "../dto/requests/sign-in-request.dto";
import { AuthPrimitiveResponse } from "../dto/responses/auth-response.dto";

interface UseCase {
    execute: (signInRequest: SignInRequest) => Promise<Promise<ApiOneResponse<AuthPrimitiveResponse>>>
}

export class SignInUseCase implements UseCase {
    constructor(
        private readonly authRepository: AuthRepositoryPort,
        private readonly jwtConfig: JwtConfig,
    ) { }

    async execute(signInRequest: SignInRequest): Promise<Promise<ApiOneResponse<AuthPrimitiveResponse>>> {
        const command = new SignInCommand(
            new AuthEmail(signInRequest.email),
            new AuthPassword(signInRequest.password),
        );

        const { data, status } = await this.authRepository.signIn(command);

        // Generar token JWT
        const token = await this.jwtConfig.generateToken({
            sub: data.id.value,      // ID del usuario (estándar JWT)
            email: data.email.value, // Email para mostrar en UI
            roles: data.roles.value, // Roles para autorización
            // Opcional: expiración personalizada
            // exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
        });

        if (!token) {
            throw ManagerError.internalServerError("Internal Server Error");
        }

        return {
            status,
            data: {
                user: {
                    id: data.id.value,
                    name: data.name.value,
                    email: data.email.value,
                    roles: data.roles.value
                },
                token: token,
            }
        }
    }
}