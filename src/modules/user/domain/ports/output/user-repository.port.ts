import { ApiAllResponse, ApiOneResponse } from "../../../../../common/interfaces/api-response.interface";
import { CreateUserCommand } from "../../models/commands/create-user.command";
import { UpdateUserCommand } from "../../models/commands/update-user.command";
import { User } from "../../models/user";
import { UserEmail } from "../../models/value-objects/user-email";
import { UserId } from "../../models/value-objects/user-id";

export interface UserRepositoryPort {
    create(createUserCommand: CreateUserCommand): Promise<boolean>;
    update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean>;
    findOne(id: UserId): Promise<ApiOneResponse<User | null>>;
    findOneByEmail(email: UserEmail): Promise<ApiOneResponse<User | null>>;
    findAll(pagination: { page: number; limit: number }): Promise<ApiAllResponse<User>>;
    remove(id: UserId): Promise<boolean>;
}