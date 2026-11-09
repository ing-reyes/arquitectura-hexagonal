import { UpdateUserCommand } from "../../domain/models/commands/update-user.command";
import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { UserId } from "../../domain/models/value-objects/user-id";
import { UserName } from "../../domain/models/value-objects/user-name";
import { UserEmail } from "../../domain/models/value-objects/user-email";
import { UserPassword } from "../../domain/models/value-objects/user-password";
import { UpdateUserRequest } from "../dto/requests/update-user-request.dto";

interface UseCase {
    execute(id: string, updateUserRequest: UpdateUserRequest): Promise<boolean>;
}

export class UpdateUserUseCase implements UseCase {
    constructor(private readonly userRepositoryPort: UserRepositoryPort) { }

    async execute(id: string, updateUserRequest: UpdateUserRequest): Promise<boolean> {
        const userId = new UserId(id);
        const command = new UpdateUserCommand(
            updateUserRequest.name !== undefined ? new UserName(updateUserRequest.name) : undefined,
            updateUserRequest.email !== undefined ? new UserEmail(updateUserRequest.email) : undefined,
            updateUserRequest.password !== undefined ? new UserPassword(updateUserRequest.password) : undefined,
        );

        if (command.name === undefined && command.email === undefined && command.password === undefined) {
            return false;
        }

        return this.userRepositoryPort.update(userId, command);
    }
}