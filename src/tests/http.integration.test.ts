import { once } from "node:events";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { JwtConfig } from "../common/config/jwt.config";
import { Roles } from "../common/enums/user-roles.enum";
import { Handler } from "../common/errors/handler.error";
import { AuthMiddleware } from "../common/middlewares/auth.middleware";
import { FactoryRoutes } from "../factory.route";
import { SignInUseCase } from "../modules/auth/application/use-cases/sign-in.use-case";
import { SignUpUseCase } from "../modules/auth/application/use-cases/sign-up.use-case";
import { AuthController } from "../modules/auth/infrastructure/adapters/input/http/controllers/auth.controller";
import { AuthRoutes } from "../modules/auth/infrastructure/adapters/input/http/routes/auth.route";
import { InMemoryAuthMapper } from "../modules/auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.mapper";
import { InMemoryAuthRepository } from "../modules/auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.repository";
import { CreateUserUseCase } from "../modules/user/application/use-cases/create-user.use-case";
import { FindAllUserUseCase } from "../modules/user/application/use-cases/find-all-user.use-case";
import { FindOneUserUseCase } from "../modules/user/application/use-cases/find-one-user.use-case";
import { RemoveUserUseCase } from "../modules/user/application/use-cases/remove-one-user.use-case";
import { UpdateUserUseCase } from "../modules/user/application/use-cases/update-user.use-case";
import { UserController } from "../modules/user/infrastructure/adapters/input/http/controllers/user.controller";
import { UserRoutes } from "../modules/user/infrastructure/adapters/input/http/routes/user.route";
import { InMemoryUserMapper } from "../modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.mapper";
import { InMemoryUserRepository } from "../modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.repository";
import { AppServer } from "../server";

const ADMIN_EMAIL = "admin@demo.com";
const USER_EMAIL = "user@demo.com";
const PASSWORD = "secret123";

let server: Server;
let baseURL: string;
let adminToken: string;
let userToken: string;
let targetId: string;

function buildTestServer(): Server {
    const handlerError = new Handler();
    const jwtConfig = new JwtConfig();
    const authMiddleware = new AuthMiddleware(jwtConfig, handlerError);

    //* Adaptador de salida con control de roles (admin* -> ADMIN)
    const userRepository = new InMemoryUserRepository(
        new InMemoryUserMapper(),
        (email) => (email.value.startsWith("admin@") ? [Roles.ADMIN] : [Roles.USER]),
    );

    const createUserUseCase = new CreateUserUseCase(userRepository);
    const updateUserUseCase = new UpdateUserUseCase(userRepository);
    const findOneUserUseCase = new FindOneUserUseCase(userRepository);
    const findAllUserUseCase = new FindAllUserUseCase(userRepository);
    const removeUserUseCase = new RemoveUserUseCase(userRepository);

    const userRoutes = new UserRoutes(
        new UserController(
            createUserUseCase,
            updateUserUseCase,
            findOneUserUseCase,
            findAllUserUseCase,
            removeUserUseCase,
            handlerError,
        ),
        authMiddleware,
    );

    const authRepository = new InMemoryAuthRepository(userRepository, new InMemoryAuthMapper());
    const authRoutes = new AuthRoutes(
        new AuthController(
            new SignInUseCase(authRepository, jwtConfig),
            new SignUpUseCase(authRepository),
            handlerError,
        ),
    );

    return new AppServer(new FactoryRoutes(userRoutes, authRoutes)).start(0);
}

function api(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${baseURL}${path}`, init);
}

function json(body: unknown, method = "POST"): RequestInit {
    return {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}

function auth(token: string, init: RequestInit = {}): RequestInit {
    return {
        ...init,
        headers: { ...((init.headers as Record<string, string>) ?? {}), authorization: `Bearer ${token}` },
    };
}

async function signIn(email: string): Promise<string> {
    const response = await api("/auth/sign-in", json({ email, password: PASSWORD }));
    const payload = await response.json() as { data: { token: string } };
    return payload.data.token;
}

describe("API HTTP (adaptadores in-memory)", () => {
    beforeAll(async () => {
        server = buildTestServer();
        if (!server.listening) await once(server, "listening");
        const { port } = server.address() as AddressInfo;
        baseURL = `http://127.0.0.1:${port}`;

        //* Seed: admin, usuario estándar y un usuario a gestionar
        await api("/auth/sign-up", json({ name: "Admin", email: ADMIN_EMAIL, password: PASSWORD }));
        await api("/auth/sign-up", json({ name: "Regular", email: USER_EMAIL, password: PASSWORD }));
        adminToken = await signIn(ADMIN_EMAIL);
        userToken = await signIn(USER_EMAIL);

        await api("/users", json({ name: "Grace", email: "grace@demo.com", password: PASSWORD }));

        const list = await api("/users", auth(adminToken));
        const body = await list.json() as { data: Array<{ id: string; email: string }> };
        targetId = body.data.find((user) => user.email === "grace@demo.com")!.id;
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("POST /auth/sign-up registra un usuario (201)", async () => {
        const response = await api("/auth/sign-up", json({ name: "Nuevo", email: "nuevo@demo.com", password: PASSWORD }));

        expect(response.status).toBe(201);
        expect(await response.json()).toBe(true);
    });

    it("POST /auth/sign-in devuelve el usuario y un token (200)", async () => {
        const response = await api("/auth/sign-in", json({ email: ADMIN_EMAIL, password: PASSWORD }));
        const payload = await response.json() as { status: { statusCode: number }; data: { user: { email: string; roles: string[] }; token: string } };

        expect(response.status).toBe(200);
        expect(payload.data.user.email).toBe(ADMIN_EMAIL);
        expect(payload.data.user.roles).toEqual([Roles.ADMIN]);
        expect(typeof payload.data.token).toBe("string");
    });

    it("POST /auth/sign-in con password incorrecto responde 400", async () => {
        const response = await api("/auth/sign-in", json({ email: ADMIN_EMAIL, password: "incorrecto" }));
        const payload = await response.json() as { statusCode: number; statusMsg: string; errors: string[] };

        expect(response.status).toBe(400);
        expect(payload.statusMsg).toBe("BAD_REQUEST");
        expect(payload.errors).toEqual(["Invalid credentials"]);
    });

    it("POST /users es público y responde 201", async () => {
        const response = await api("/users", json({ name: "Alan", email: "alan@demo.com", password: PASSWORD }));

        expect(response.status).toBe(201);
        expect(await response.json()).toBe(true);
    });

    it("POST /users con body inválido responde 400 con el detalle de errores", async () => {
        const response = await api("/users", json({ name: "Sin email" }));
        const payload = await response.json() as { statusCode: number; errors: string[] };

        expect(response.status).toBe(400);
        expect(payload.statusCode).toBe(400);
        expect(payload.errors).toContain("Email is required");
    });

    it("GET /users sin token responde 401", async () => {
        const response = await api("/users");
        const payload = await response.json() as { statusCode: number };

        expect(response.status).toBe(401);
        expect(payload.statusCode).toBe(401);
    });

    it("GET /users con esquema de autorización incorrecto responde 401", async () => {
        const response = await fetch(`${baseURL}/users`, { headers: { authorization: `Basic ${adminToken}` } });

        expect(response.status).toBe(401);
    });

    it("GET /users con rol USER responde 403", async () => {
        const response = await api("/users", auth(userToken));
        const payload = await response.json() as { statusCode: number; statusMsg: string };

        expect(response.status).toBe(403);
        expect(payload.statusMsg).toBe("FORBIDDEN");
    });

    it("GET /users con rol ADMIN devuelve la lista paginada (200)", async () => {
        const response = await api("/users?page=1&limit=10", auth(adminToken));
        const payload = await response.json() as {
            meta: { page: number; limit: number; total: number };
            status: { statusCode: number };
            data: Array<{ email: string }>;
        };

        expect(response.status).toBe(200);
        expect(payload.status.statusCode).toBe(200);
        expect(payload.meta).toMatchObject({ page: 1, limit: 10 });
        expect(payload.data.length).toBeGreaterThanOrEqual(3);
        expect(payload.data.map((user) => user.email)).toContain(ADMIN_EMAIL);
    });

    it("GET /users/:id con token devuelve el recurso (200)", async () => {
        const response = await api(`/users/${targetId}`, auth(userToken));
        const payload = await response.json() as { data: { id: string; name: string } | null };

        expect(response.status).toBe(200);
        expect(payload.data?.id).toBe(targetId);
        expect(payload.data?.name).toBe("Grace");
        expect(payload.data).not.toHaveProperty("password");
    });

    it("GET /users/:id sin token responde 401", async () => {
        const response = await api(`/users/${targetId}`);

        expect(response.status).toBe(401);
    });

    it("GET /users/:id con id que no es MongoID responde 400", async () => {
        const response = await api("/users/no-es-un-id", auth(userToken));
        const payload = await response.json() as { errors: string[] };

        expect(response.status).toBe(400);
        expect(payload.errors[0]).toContain("not a valid MongoID");
    });

    it("PATCH /users/:id actualiza el recurso (200)", async () => {
        const response = await api(`/users/${targetId}`, auth(userToken, json({ name: "Grace Hopper" }, "PATCH")));

        expect(response.status).toBe(200);
        expect(await response.json()).toBe(true);

        const after = await api(`/users/${targetId}`, auth(userToken));
        const payload = await after.json() as { data: { name: string } | null };
        expect(payload.data?.name).toBe("Grace Hopper");
    });

    it("DELETE /users/:id elimina el recurso (200)", async () => {
        const response = await api(`/users/${targetId}`, { method: "DELETE", headers: { authorization: `Bearer ${userToken}` } });

        expect(response.status).toBe(200);
        expect(await response.json()).toBe(true);

        const after = await api(`/users/${targetId}`, auth(userToken));
        const payload = await after.json() as { data: unknown };
        expect(payload.data).toBeNull();
    });

    it("limita los intentos de autenticación (429)", async () => {
        const statuses: number[] = [];

        for (let attempt = 0; attempt < 12; attempt++) {
            const response = await api("/auth/sign-in", json({ email: USER_EMAIL, password: "mal-password" }));
            statuses.push(response.status);
        }

        expect(statuses).toContain(429);
    });
});
