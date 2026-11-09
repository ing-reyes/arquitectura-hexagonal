import { ApiOneResponse, ApiAllResponse } from "../../../../../../../common/interfaces/api-response.interface";
import { HttpStatus } from "../../../../../../../common/enums/http-status.enum";
import { PaginationDto } from "../../../../../../../common/dtos/pagination/pagination.dto";
import { User } from "../../../../../domain/models/user";
import { UserRepositoryPort } from "../../../../../domain/ports/output/user-repository.port";
import { Roles } from "../../../../../../../common/enums/user-roles.enum";
import { UserId } from "../../../../../domain/models/value-objects/user-id";
import { UserRoles } from "../../../../../domain/models/value-objects/user-roles";
import { UserCreatedAt } from "../../../../../domain/models/value-objects/user-created-at";
import { UserUpdatedAt } from "../../../../../domain/models/value-objects/user-updated-at";
import { UserLastAccess } from "../../../../../domain/models/value-objects/user-last-access";
import { InMemoryUserMapper } from "./in-memory-user.mapper";
import { CreateUserCommand } from "../../../../../domain/models/commands/create-user.command";
import { UserName } from "../../../../../domain/models/value-objects/user-name";
import { UserEmail } from "../../../../../domain/models/value-objects/user-email";
import { UserPassword } from "../../../../../domain/models/value-objects/user-password";
import { UpdateUserCommand } from "../../../../../domain/models/commands/update-user.command";

export class InMemoryUserRepository implements UserRepositoryPort {
    private readonly users: User[] = [];

    constructor( private readonly mapper: InMemoryUserMapper ){}

    async create(createUserCommand: CreateUserCommand): Promise<boolean> {
        const { email, name, password } = createUserCommand;
        const user: User = {
            id: new UserId((this.users.length+1).toString()),
            name: new UserName(name.value),
            email: new UserEmail(email.value),
            password: new UserPassword(password.value),
            roles: new UserRoles([Roles.USER]),
            createdAt: new UserCreatedAt(new Date()),
            updatedAt: new UserUpdatedAt(new Date()),
            lastAccess: new UserLastAccess(new Date()),
            mapToPrimitive: () => {
                return {
                    id: user.id.value,
                    name: user.name.value,
                    email: user.email.value,
                    password: user.password.value,
                    roles: user.roles.value,
                    createdAt: user.createdAt.value,
                    updatedAt: user.updatedAt.value,
                    lastAccess: user.lastAccess.value,
                }
            }
        }

        this.users.push( user );

        return true;
    }
    async update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean> {
        const { email, name, password } = updateUserCommand;
        const findIndex = this.users.findIndex((user)=>user.id.value===id.value);
        if( findIndex === -1) return false;

        const user: User = this.users[findIndex]!;
        this.users[findIndex] = {
            ...user,
            name: name ?? user.name,
            email: email ?? user.email,
            password: password ?? user.password,
            updatedAt: new UserUpdatedAt(new Date()),
            lastAccess: new UserLastAccess(new Date()),
            mapToPrimitive: () => {
                return {
                    id: user.id.value,
                    name: user.name.value,
                    email: user.email.value,
                    password: user.password.value,
                    roles: user.roles.value,
                    createdAt: user.createdAt.value,
                    updatedAt: user.updatedAt.value,
                    lastAccess: user.lastAccess.value,
                }
            }
        }

        return true;
    }
    async findOne(id: UserId): Promise<ApiOneResponse<User | null>> {
        const user = this.users.find((user)=>user.id.value===id.value);

        return {
            status: {
                statusCode: HttpStatus.OK,
                statusMsg: "OK",
                error: null,
            },
            data: user || null,
        }
    }
    async findAll(paginationDto: PaginationDto): Promise<ApiAllResponse<User>> {
        const { limit = 10, page = 1 } = paginationDto;
        
        try {
            const users = this.users.slice( (page-1)*limit, page*limit );
            const lastPage = Math.ceil(this.users.length / limit);
            
            return {
                status: {
                    statusCode: HttpStatus.OK,
                    statusMsg: "OK", 
                    error: null,
                },
                meta: {
                    page: page,
                    lastPage: lastPage,
                    limit: limit,
                    total: users.length,
                },
                data: users.map((user)=>this.mapper.toDomain(user.mapToPrimitive()))
            }
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async remove(id: UserId): Promise<boolean> {
        const findIndex = this.users.findIndex((user)=>user.id===id);
        if(findIndex===-1) return false;
        
        this.users.splice(findIndex, 1);

        return true;
    }

    async findOneByEmail(email: UserEmail): Promise<ApiOneResponse<User | null>> {
        return {
            status: {
                statusCode: HttpStatus.OK,
                statusMsg: "OK",
                error: null,
            },
            data: this.users.find((user)=>user.email.value===email.value) || null,
        }
    }
}