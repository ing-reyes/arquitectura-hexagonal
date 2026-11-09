import { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { JwtConfig } from "../config/jwt.config";
import { Roles } from "../enums/user-roles.enum";
import { Handler } from "../errors/handler.error";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthMiddleware } from "./auth.middleware";

type TestResponse = Response & { statusCode: number; body: unknown };

function createRes(): TestResponse {
    const res = {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        json(payload: unknown) {
            res.body = payload;
            return res;
        },
    };
    return res as unknown as TestResponse;
}

function createReq(authorization?: string): Request {
    return {
        header: (name: string) =>
            name.toLowerCase() === "authorization" ? authorization : undefined,
    } as unknown as Request;
}

function createToken(payload: Partial<JwtPayload>): Promise<string> {
    return new JwtConfig().generateToken({
        sub: payload.sub ?? "1",
        email: payload.email ?? "ada@demo.com",
        roles: payload.roles ?? [Roles.USER],
    }) as Promise<string>;
}

describe("AuthMiddleware", () => {
    const middleware = new AuthMiddleware(new JwtConfig(), new Handler());

    it("responde 401 si no hay header de autorización", async () => {
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate()(createReq(), res, next.run);

        expect(res.statusCode).toBe(401);
        expect(res.body).toMatchObject({ statusCode: 401, statusMsg: "UNAUTHORIZED" });
        expect(next.called).toBe(false);
    });

    it("responde 401 si el header no usa el esquema Bearer", async () => {
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate()(createReq("Basic dXNlcjpwYXNz"), res, next.run);

        expect(res.statusCode).toBe(401);
        expect(next.called).toBe(false);
    });

    it("responde 401 ante un token inválido", async () => {
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate()(createReq("Bearer token-falsificado"), res, next.run);

        expect(res.statusCode).toBe(401);
        expect(next.called).toBe(false);
    });

    it("permite el paso con un token válido y adjunta el payload a la request", async () => {
        const token = await createToken({});
        const req = createReq(`Bearer ${token}`);
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate()(req, res, next.run);

        expect(next.called).toBe(true);
        expect(res.statusCode).toBe(200);
        expect(req.user?.sub).toBe("1");
        expect(req.user?.roles).toEqual([Roles.USER]);
    });

    it("responde 403 si el usuario no tiene el rol requerido", async () => {
        const token = await createToken({ roles: [Roles.USER] });
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate([Roles.ADMIN])(createReq(`Bearer ${token}`), res, next.run);

        expect(res.statusCode).toBe(403);
        expect(res.body).toMatchObject({ statusCode: 403, statusMsg: "FORBIDDEN" });
        expect(next.called).toBe(false);
    });

    it("permite el paso si el usuario posee uno de los roles requeridos", async () => {
        const token = await createToken({ roles: [Roles.ADMIN, Roles.USER] });
        const res = createRes();
        const next = { called: false, run: () => { next.called = true; } };

        await middleware.validate([Roles.ADMIN])(createReq(`Bearer ${token}`), res, next.run);

        expect(next.called).toBe(true);
        expect(res.statusCode).toBe(200);
    });
});
