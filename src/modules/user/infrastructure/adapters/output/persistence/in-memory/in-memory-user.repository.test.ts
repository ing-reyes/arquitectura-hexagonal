import { describe, expect, it } from "vitest";
import { PaginationDto } from "../../../../../../../common/dtos/pagination/pagination.dto";
import { HttpStatus } from "../../../../../../../common/enums/http-status.enum";
import { Roles } from "../../../../../../../common/enums/user-roles.enum";
import { CreateUserCommand } from "../../../../../domain/models/commands/create-user.command";
import { UpdateUserCommand } from "../../../../../domain/models/commands/update-user.command";
import { UserEmail } from "../../../../../domain/models/value-objects/user-email";
import { UserId } from "../../../../../domain/models/value-objects/user-id";
import { UserName } from "../../../../../domain/models/value-objects/user-name";
import { UserPassword } from "../../../../../domain/models/value-objects/user-password";
import { InMemoryUserMapper } from "./in-memory-user.mapper";
import { InMemoryUserRepository } from "./in-memory-user.repository";

function id(n: number): string {
    return n.toString(16).padStart(24, "0");
}

function createUserCommand(name = "Ada", email = "ada@demo.com", password = "secret123"): CreateUserCommand {
    return new CreateUserCommand(new UserName(name), new UserEmail(email), new UserPassword(password));
}

describe("InMemoryUserRepository", () => {
    function buildRepository(): InMemoryUserRepository {
        return new InMemoryUserRepository(new InMemoryUserMapper());
    }

    it("crea y recupera un usuario", async () => {
        const repository = buildRepository();

        await repository.create(createUserCommand());
        const found = await repository.findOne(new UserId(id(1)));

        expect(found.status.statusCode).toBe(HttpStatus.OK);
        expect(found.data?.name.value).toBe("Ada");
        expect(found.data?.id.value).toBe(id(1));
        expect(found.data?.roles.value).toEqual([Roles.USER]);
    });

    it("asigna ids incrementales", async () => {
        const repository = buildRepository();

        await repository.create(createUserCommand("Ada", "ada@demo.com"));
        await repository.create(createUserCommand("Grace", "grace@demo.com"));

        expect((await repository.findOne(new UserId(id(1)))).data?.name.value).toBe("Ada");
        expect((await repository.findOne(new UserId(id(2)))).data?.name.value).toBe("Grace");
    });

    it("busca por email", async () => {
        const repository = buildRepository();
        await repository.create(createUserCommand());

        const found = await repository.findOneByEmail(new UserEmail("ada@demo.com"));
        const missing = await repository.findOneByEmail(new UserEmail("otro@demo.com"));

        expect(found.data?.email.value).toBe("ada@demo.com");
        expect(missing.data).toBeNull();
    });

    it("pagina el listado y reporta el total real", async () => {
        const repository = buildRepository();
        await repository.create(createUserCommand("Ada", "ada@demo.com"));
        await repository.create(createUserCommand("Grace", "grace@demo.com"));
        await repository.create(createUserCommand("Alan", "alan@demo.com"));

        const page = await repository.findAll(new PaginationDto(1, 2));

        expect(page.data).toHaveLength(2);
        expect(page.meta).toEqual({ page: 1, limit: 2, lastPage: 2, total: 3 });
        expect(page.data[0]?.name.value).toBe("Ada");

        const secondPage = await repository.findAll(new PaginationDto(2, 2));
        expect(secondPage.data).toHaveLength(1);
        expect(secondPage.data[0]?.name.value).toBe("Alan");
    });

    it("actualiza solo los campos enviados conservando la fecha de creación", async () => {
        const repository = buildRepository();
        await repository.create(createUserCommand());

        const before = await repository.findOne(new UserId(id(1)));
        const updated = await repository.update(
            new UserId(id(1)),
            new UpdateUserCommand(new UserName("Grace"), undefined, undefined),
        );

        expect(updated).toBe(true);

        const after = await repository.findOne(new UserId(id(1)));
        expect(after.data?.name.value).toBe("Grace");
        expect(after.data?.email.value).toBe("ada@demo.com");
        expect(after.data?.createdAt.value).toEqual(before.data?.createdAt.value);
    });

    it("devuelve false al actualizar un id inexistente", async () => {
        const repository = buildRepository();

        const updated = await repository.update(
            new UserId(id(999)),
            new UpdateUserCommand(new UserName("Ghost"), undefined, undefined),
        );

        expect(updated).toBe(false);
    });

    it("elimina un usuario y devuelve false si ya no existe", async () => {
        const repository = buildRepository();
        await repository.create(createUserCommand());

        expect(await repository.remove(new UserId(id(1)))).toBe(true);
        expect((await repository.findOne(new UserId(id(1)))).data).toBeNull();
        expect(await repository.remove(new UserId(id(1)))).toBe(false);
    });
});
