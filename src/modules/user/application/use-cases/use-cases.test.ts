import { describe, expect, it } from "vitest";
import { HttpStatus } from "../../../../common/enums/http-status.enum";
import { Roles } from "../../../../common/enums/user-roles.enum";
import { ManagerError } from "../../../../common/errors/manager.error";
import { PaginationDto } from "../../../../common/dtos/pagination/pagination.dto";
import { ApiAllResponse, ApiOneResponse } from "../../../../common/interfaces/api-response.interface";
import { CreateUserCommand } from "../../domain/models/commands/create-user.command";
import { UpdateUserCommand } from "../../domain/models/commands/update-user.command";
import { User } from "../../domain/models/user";
import { UserCreatedAt } from "../../domain/models/value-objects/user-created-at";
import { UserEmail } from "../../domain/models/value-objects/user-email";
import { UserId } from "../../domain/models/value-objects/user-id";
import { UserLastAccess } from "../../domain/models/value-objects/user-last-access";
import { UserName } from "../../domain/models/value-objects/user-name";
import { UserPassword } from "../../domain/models/value-objects/user-password";
import { UserRoles } from "../../domain/models/value-objects/user-roles";
import { UserUpdatedAt } from "../../domain/models/value-objects/user-updated-at";
import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { CreateUserRequest } from "../dto/requests/create-user-request.dto";
import { UpdateUserRequest } from "../dto/requests/update-user-request.dto";
import { CreateUserUseCase } from "./create-user.use-case";
import { FindAllUserUseCase } from "./find-all-user.use-case";
import { FindOneUserUseCase } from "./find-one-user.use-case";
import { RemoveUserUseCase } from "./remove-one-user.use-case";
import { UpdateUserUseCase } from "./update-user.use-case";

const OK_STATUS = { statusCode: HttpStatus.OK, statusMsg: "OK", error: null } as const;

function buildUser(id = "1"): User {
    return new User(
        new UserId(id),
        new UserName("Ada"),
        new UserEmail("ada@demo.com"),
        new UserPassword("secret123"),
        new UserRoles([Roles.USER]),
        new UserCreatedAt(new Date("2024-01-01T00:00:00.000Z")),
        new UserUpdatedAt(new Date("2024-01-01T00:00:00.000Z")),
        new UserLastAccess(new Date("2024-01-01T00:00:00.000Z")),
    );
}

class StubUserRepository implements UserRepositoryPort {
    public readonly created: CreateUserCommand[] = [];
    public readonly updated: { id: UserId; command: UpdateUserCommand }[] = [];
    public readonly removed: UserId[] = [];
    public readonly users: User[] = [];

    async create(createUserCommand: CreateUserCommand): Promise<boolean> {
        this.created.push(createUserCommand);
        return true;
    }

    async update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean> {
        this.updated.push({ id, command: updateUserCommand });
        return true;
    }

    async findOne(id: UserId): Promise<ApiOneResponse<User | null>> {
        const user = this.users.find((candidate) => candidate.id.value === id.value) ?? null;
        return { status: { ...OK_STATUS }, data: user };
    }

    async findOneByEmail(email: UserEmail): Promise<ApiOneResponse<User | null>> {
        const user = this.users.find((candidate) => candidate.email.value === email.value) ?? null;
        return { status: { ...OK_STATUS }, data: user };
    }

    async findAll(pagination: { page: number; limit: number }): Promise<ApiAllResponse<User>> {
        const { page, limit } = pagination;
        return {
            status: { ...OK_STATUS },
            meta: { page, limit, lastPage: 1, total: this.users.length },
            data: this.users,
        };
    }

    async remove(id: UserId): Promise<boolean> {
        this.removed.push(id);
        return true;
    }
}

describe("User use cases", () => {
    describe("CreateUserUseCase", () => {
        it("construye los value objects y delega en el puerto", async () => {
            const repository = new StubUserRepository();
            const useCase = new CreateUserUseCase(repository);

            const result = await useCase.execute(new CreateUserRequest("Ada", "ada@demo.com", "secret123"));

            expect(result).toBe(true);
            expect(repository.created).toHaveLength(1);

            const command = repository.created[0]!;
            expect(command).toBeInstanceOf(CreateUserCommand);
            expect(command.name).toBeInstanceOf(UserName);
            expect(command.email).toBeInstanceOf(UserEmail);
            expect(command.password).toBeInstanceOf(UserPassword);
            expect(command.email.value).toBe("ada@demo.com");
        });

        it("falla rápido con un email inválido (validación en el dominio)", async () => {
            const repository = new StubUserRepository();
            const useCase = new CreateUserUseCase(repository);

            expect(() => useCase.execute(new CreateUserRequest("Ada", "ada-demo.com", "secret123")))
                .toThrowError(ManagerError);

            expect(repository.created).toHaveLength(0);
        });
    });

    describe("UpdateUserUseCase", () => {
        it("devuelve false si no hay nada que actualizar", async () => {
            const repository = new StubUserRepository();
            const useCase = new UpdateUserUseCase(repository);

            const result = await useCase.execute("1", new UpdateUserRequest());

            expect(result).toBe(false);
            expect(repository.updated).toHaveLength(0);
        });

        it("construye el comando solo con los campos enviados", async () => {
            const repository = new StubUserRepository();
            const useCase = new UpdateUserUseCase(repository);

            const result = await useCase.execute("1", new UpdateUserRequest("Grace"));

            expect(result).toBe(true);
            expect(repository.updated[0]!.id.value).toBe("1");
            expect(repository.updated[0]!.command.name?.value).toBe("Grace");
            expect(repository.updated[0]!.command.email).toBeUndefined();
            expect(repository.updated[0]!.command.password).toBeUndefined();
        });
    });

    describe("FindOneUserUseCase", () => {
        it("serializa la entidad a un DTO primitivo", async () => {
            const repository = new StubUserRepository();
            repository.users.push(buildUser());
            const useCase = new FindOneUserUseCase(repository);

            const response = await useCase.execute("1");

            expect(response.status.statusCode).toBe(HttpStatus.OK);
            expect(response.data).not.toBeNull();
            expect(response.data).not.toBeInstanceOf(User);
            expect(response.data!.id).toBe("1");
            expect(response.data!.name).toBe("Ada");
            expect(response.data!.roles).toEqual([Roles.USER]);
        });

        it("devuelve null cuando el usuario no existe", async () => {
            const repository = new StubUserRepository();
            const useCase = new FindOneUserUseCase(repository);

            const response = await useCase.execute("999");

            expect(response.data).toBeNull();
        });

        it("nunca expone la contraseña (ni su hash) en la respuesta", async () => {
            const repository = new StubUserRepository();
            repository.users.push(buildUser());
            const useCase = new FindOneUserUseCase(repository);

            const response = await useCase.execute("1");

            expect(response.data).not.toHaveProperty("password");
            expect(JSON.stringify(response)).not.toContain("secret123");
        });
    });

    describe("FindAllUserUseCase", () => {
        it("devuelve la colección serializada con metadata de paginación", async () => {
            const repository = new StubUserRepository();
            repository.users.push(buildUser("1"), buildUser("2"));
            const useCase = new FindAllUserUseCase(repository);

            const response = await useCase.execute(new PaginationDto(1, 10));

            expect(response.data).toHaveLength(2);
            expect(response.data.every((user) => typeof user.name === "string")).toBe(true);
            expect(response.meta).toEqual({ page: 1, limit: 10, lastPage: 1, total: 2 });
        });
    });

    describe("RemoveUserUseCase", () => {
        it("delega la eliminación en el puerto", async () => {
            const repository = new StubUserRepository();
            const useCase = new RemoveUserUseCase(repository);

            const result = await useCase.execute("1");

            expect(result).toBe(true);
            expect(repository.removed[0]!.value).toBe("1");
        });
    });
});
