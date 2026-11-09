import { describe, expect, it } from "vitest";
import { ManagerError } from "../../../../../common/errors/manager.error";
import { Roles } from "../../../../../common/enums/user-roles.enum";
import { UserCreatedAt } from "./user-created-at";
import { UserEmail } from "./user-email";
import { UserId } from "./user-id";
import { UserName } from "./user-name";
import { UserPassword } from "./user-password";
import { UserRoles } from "./user-roles";

function shouldThrow(run: () => unknown): ManagerError {
    try {
        run();
    } catch (error) {
        return error as ManagerError;
    }
    throw new Error("Expected the value object to throw a ManagerError");
}

describe("User value objects", () => {
    describe("UserName", () => {
        it("acepta un nombre válido", () => {
            expect(new UserName("Ada").value).toBe("Ada");
        });

        it("rechaza un nombre vacío", () => {
            const error = shouldThrow(() => new UserName(""));
            expect(error).toBeInstanceOf(ManagerError);
            expect(error.statusCode).toBe(400);
            expect(error.message).toBe("Name is required");
        });

        it("rechaza un nombre de un solo carácter", () => {
            expect(shouldThrow(() => new UserName("A")).message).toBe(
                "Name must be at least 2 characters long",
            );
        });
    });

    describe("UserEmail", () => {
        it("acepta un email válido", () => {
            expect(new UserEmail("ada@demo.com").value).toBe("ada@demo.com");
        });

        it("rechaza un email sin arroba", () => {
            expect(shouldThrow(() => new UserEmail("ada.demo.com")).message).toBe("Email is not valid");
        });
    });

    describe("UserPassword", () => {
        it("acepta un password de 6 o más caracteres", () => {
            expect(new UserPassword("secret123").value).toBe("secret123");
        });

        it("rechaza un password corto", () => {
            expect(shouldThrow(() => new UserPassword("12345")).message).toBe(
                "Password must be at least 6 characters long",
            );
        });
    });

    describe("UserId", () => {
        it("acepta un id no vacío", () => {
            expect(new UserId("abc123").value).toBe("abc123");
        });

        it("rechaza un id vacío", () => {
            expect(shouldThrow(() => new UserId("")).message).toBe("Id is required");
        });
    });

    describe("UserRoles", () => {
        it("acepta roles válidos", () => {
            expect(new UserRoles([Roles.USER]).value).toEqual([Roles.USER]);
            expect(new UserRoles([Roles.USER, Roles.ADMIN]).value).toHaveLength(2);
        });

        it("rechaza un arreglo vacío", () => {
            expect(shouldThrow(() => new UserRoles([])).message).toBe(
                "At least one role must be assigned",
            );
        });

        it("rechaza roles desconocidos", () => {
            expect(shouldThrow(() => new UserRoles(["SUPERADMIN" as Roles])).message).toBe("Invalid role");
        });

        it("rechaza algo que no sea arreglo", () => {
            expect(shouldThrow(() => new UserRoles("USER" as unknown as Roles[])).message).toBe(
                "Roles must be an array",
            );
        });
    });

    describe("UserCreatedAt / UserUpdatedAt / UserLastAccess", () => {
        it("aceptan fechas válidas", () => {
            const now = new Date();
            expect(new UserCreatedAt(now).value).toBe(now);
            expect(new UserCreatedAt(now).value).toBeInstanceOf(Date);
        });
    });
});
