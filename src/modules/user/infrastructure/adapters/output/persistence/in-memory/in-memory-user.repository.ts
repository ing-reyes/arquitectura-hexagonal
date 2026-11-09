import { ApiAllResponse, ApiOneResponse } from "../../../../../../../common/interfaces/api-response.interface";
import { HttpStatus } from "../../../../../../../common/enums/http-status.enum";
import { PaginationDto } from "../../../../../../../common/dtos/pagination/pagination.dto";
import { Roles } from "../../../../../../../common/enums/user-roles.enum";
import { User } from "../../../../../domain/models/user";
import { UserRepositoryPort } from "../../../../../domain/ports/output/user-repository.port";
import { UserId } from "../../../../../domain/models/value-objects/user-id";
import { UserRoles } from "../../../../../domain/models/value-objects/user-roles";
import { UserCreatedAt } from "../../../../../domain/models/value-objects/user-created-at";
import { UserUpdatedAt } from "../../../../../domain/models/value-objects/user-updated-at";
import { UserLastAccess } from "../../../../../domain/models/value-objects/user-last-access";
import { UserName } from "../../../../../domain/models/value-objects/user-name";
import { UserEmail } from "../../../../../domain/models/value-objects/user-email";
import { UserPassword } from "../../../../../domain/models/value-objects/user-password";
import { InMemoryUserMapper } from "./in-memory-user.mapper";
import { CreateUserCommand } from "../../../../../domain/models/commands/create-user.command";
import { UpdateUserCommand } from "../../../../../domain/models/commands/update-user.command";

export class InMemoryUserRepository implements UserRepositoryPort {
    private readonly users: User[] = [];
    private nextId = 1;

    constructor(
        private readonly mapper: InMemoryUserMapper,
        private readonly rolesProvider: (email: UserEmail) => Roles[] = () => [Roles.USER],
    ) { }

    async create(createUserCommand: CreateUserCommand): Promise<boolean> {
        const { email, name, password } = createUserCommand;
        const now = new Date();

        const user = new User(
            new UserId((this.nextId++).toString(16).padStart(24, "0")),
            new UserName(name.value),
            new UserEmail(email.value),
            new UserPassword(password.value),
            new UserRoles(this.rolesProvider(email)),
            new UserCreatedAt(now),
            new UserUpdatedAt(now),
            new UserLastAccess(now),
        );

        this.users.push(user);
        return true;
    }

    async update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean> {
        const findIndex = this.users.findIndex((user) => user.id.value === id.value);
        if (findIndex === -1) return false;

        const current = this.users[findIndex]!;
        const now = new Date();

        this.users[findIndex] = new User(
            current.id,
            updateUserCommand.name ?? current.name,
            updateUserCommand.email ?? current.email,
            updateUserCommand.password ?? current.password,
            current.roles,
            current.createdAt,
            new UserUpdatedAt(now),
            new UserLastAccess(now),
        );

        return true;
    }

    async findOne(id: UserId): Promise<ApiOneResponse<User | null>> {
        return {
            status: {
                statusCode: HttpStatus.OK,
                statusMsg: "OK",
                error: null,
            },
            data: this.users.find((user) => user.id.value === id.value) ?? null,
        };
    }

    async findOneByEmail(email: UserEmail): Promise<ApiOneResponse<User | null>> {
        return {
            status: {
                statusCode: HttpStatus.OK,
                statusMsg: "OK",
                error: null,
            },
            data: this.users.find((user) => user.email.value === email.value) ?? null,
        };
    }

    async findAll(paginationDto: PaginationDto): Promise<ApiAllResponse<User>> {
        const { limit = 10, page = 1 } = paginationDto;

        try {
            const total = this.users.length;
            const slice = this.users.slice((page - 1) * limit, page * limit);
            const lastPage = Math.max(1, Math.ceil(total / limit));

            return {
                status: {
                    statusCode: HttpStatus.OK,
                    statusMsg: "OK",
                    error: null,
                },
                meta: {
                    page,
                    lastPage,
                    limit,
                    total,
                },
                data: slice.map((user) => this.mapper.toDomain(user.mapToPrimitive())),
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    async remove(id: UserId): Promise<boolean> {
        const findIndex = this.users.findIndex((user) => user.id.value === id.value);
        if (findIndex === -1) return false;

        this.users.splice(findIndex, 1);
        return true;
    }
}
