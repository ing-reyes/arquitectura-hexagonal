import { describe, expect, it } from "vitest";
import { Roles } from "../../../../../common/enums/user-roles.enum";
import { ManagerError } from "../../../../../common/errors/manager.error";
import { AuthEmail } from "./auth-email";
import { AuthId } from "./auth-id";
import { AuthName } from "./auth-name";
import { AuthPassword } from "./auth-password";
import { AuthRoles } from "./auth-roles";

function shouldThrow(run: () => unknown): ManagerError {
    try {
        run();
    } catch (error) {
        return error as ManagerError;
    }
    throw new Error("Expected the value object to throw a ManagerError");
}

describe("Auth value objects", () => {
    describe("AuthEmail", () => {
        it("acepta un email válido", () => {
            expect(new AuthEmail("ada@demo.com").value).toBe("ada@demo.com");
        });

        it("rechaza un email inválido", () => {
            const error = shouldThrow(() => new AuthEmail("adademo.com"));
            expect(error).toBeInstanceOf(ManagerError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe("Email is not valid");
        });
    });

    describe("AuthPassword", () => {
        it("acepta un password de 6 o más caracteres", () => {
            expect(new AuthPassword("secret123").value).toBe("secret123");
        });

        it("rechaza un password corto", () => {
            expect(shouldThrow(() => new AuthPassword("12345")).message).toBe(
                "Password must be at least 6 characters long",
            );
        });
    });

    describe("AuthName", () => {
        it("acepta un nombre válido", () => {
            expect(new AuthName("Ada").value).toBe("Ada");
        });

        it("rechaza un nombre corto", () => {
            expect(shouldThrow(() => new AuthName("A")).message).toBe(
                "Name must be at least 2 characters long",
            );
        });
    });

    describe("AuthId", () => {
        it("acepta un id no vacío", () => {
            expect(new AuthId("u-1").value).toBe("u-1");
        });

        it("rechaza un id vacío", () => {
            expect(shouldThrow(() => new AuthId("")).message).toBe("Token is required");
        });
    });

    describe("AuthRoles", () => {
        it("acepta roles válidos", () => {
            expect(new AuthRoles([Roles.ADMIN]).value).toEqual([Roles.ADMIN]);
        });

        it("rechaza roles vacíos", () => {
            expect(shouldThrow(() => new AuthRoles([])).message).toBe("Roles is required");
        });
    });
});
