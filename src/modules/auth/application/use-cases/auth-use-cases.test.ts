import { describe, expect, it } from "vitest";
import { JwtConfig } from "../../../../common/config/jwt.config";
import { Roles } from "../../../../common/enums/user-roles.enum";
import { ManagerError } from "../../../../common/errors/manager.error";
import { JwtPayload } from "../../../../common/interfaces/jwt-payload.interface";
import { UserEmail } from "../../../user/domain/models/value-objects/user-email";
import { InMemoryUserMapper } from "../../../user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.mapper";
import { InMemoryUserRepository } from "../../../user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.repository";
import { SignInRequest } from "../dto/requests/sign-in-request.dto";
import { SignUpRequest } from "../dto/requests/sign-up-request.dto";
import { SignInUseCase } from "./sign-in.use-case";
import { SignUpUseCase } from "./sign-up.use-case";
import { InMemoryAuthMapper } from "../../../auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.mapper";
import { InMemoryAuthRepository } from "../../../auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.repository";

function buildAuthStack() {
    const userRepository = new InMemoryUserRepository(new InMemoryUserMapper());
    const authRepository = new InMemoryAuthRepository(userRepository, new InMemoryAuthMapper());
    const jwtConfig = new JwtConfig();

    return {
        userRepository,
        signUpUseCase: new SignUpUseCase(authRepository),
        signInUseCase: new SignInUseCase(authRepository, jwtConfig),
        jwtConfig,
    };
}

describe("Auth use cases", () => {
    it("signUp registra un usuario en el repositorio", async () => {
        const { signUpUseCase, userRepository } = buildAuthStack();

        const result = await signUpUseCase.execute(new SignUpRequest("Ada", "ada@demo.com", "secret123"));

        expect(result).toBe(true);

        const stored = await userRepository.findOneByEmail(new UserEmail("ada@demo.com"));
        expect(stored.data?.email.value).toBe("ada@demo.com");
    });

    it("signUp valida las reglas del dominio antes de persistir", async () => {
        const { signUpUseCase, userRepository } = buildAuthStack();

        await expect(signUpUseCase.execute(new SignUpRequest("Ada", "ada@demo.com", "12345")))
            .rejects.toThrowError(ManagerError);

        const stored = await userRepository.findOneByEmail(new UserEmail("ada@demo.com"));
        expect(stored.data).toBeNull();
    });

    it("signIn devuelve el usuario y un token JWT válido", async () => {
        const { signUpUseCase, signInUseCase, jwtConfig } = buildAuthStack();

        await signUpUseCase.execute(new SignUpRequest("Ada", "ada@demo.com", "secret123"));
        const response = await signInUseCase.execute(new SignInRequest("ada@demo.com", "secret123"));

        expect(response.status.statusCode).toBe(200);
        expect(response.data.user.email).toBe("ada@demo.com");
        expect(response.data.user.roles).toEqual([Roles.USER]);
        expect(typeof response.data.token).toBe("string");

        const payload = await jwtConfig.validateToken<JwtPayload>(response.data.token);
        expect(payload).not.toBeNull();
        expect(payload!.email).toBe("ada@demo.com");
        expect(payload!.sub).toBe(response.data.user.id);
    });

    it("signIn rechaza un password incorrecto", async () => {
        const { signUpUseCase, signInUseCase } = buildAuthStack();

        await signUpUseCase.execute(new SignUpRequest("Ada", "ada@demo.com", "secret123"));

        await expect(signInUseCase.execute(new SignInRequest("ada@demo.com", "otro-password")))
            .rejects.toThrowError(/Invalid credentials/);
    });

    it("signIn rechaza un usuario inexistente", async () => {
        const { signInUseCase } = buildAuthStack();

        await expect(signInUseCase.execute(new SignInRequest("no@existe.com", "secret123")))
            .rejects.toThrowError(/User not found/);
    });

    it("rechaza tokens manipulados o con formato inválido", async () => {
        const { jwtConfig } = buildAuthStack();

        const forged = await new JwtConfig().generateToken({ sub: "1" });
        const tampered = `${forged!.slice(0, -1)}x`;

        expect(await jwtConfig.validateToken(tampered)).toBeNull();
        expect(await jwtConfig.validateToken("token-basura")).toBeNull();
    });
});
