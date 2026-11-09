import { CreateUserCommand } from "../../domain/models/commands/create-user.command";
import { UserEmail } from "../../domain/models/value-objects/user-email";
import { UserName } from "../../domain/models/value-objects/user-name";
import { UserPassword } from "../../domain/models/value-objects/user-password";
import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { CreateUserRequest } from "../dto/requests/create-user-request.dto";

interface UseCase{
    execute( createUserRequest: CreateUserRequest ): Promise<boolean>;
}

export class CreateUserUseCase implements UseCase {
    constructor( private readonly userRepositoryPort: UserRepositoryPort ){}

    execute(createUserRequest: CreateUserRequest): Promise<boolean> {
        const command = new CreateUserCommand(
            new UserName(createUserRequest.name),
            new UserEmail(createUserRequest.email),
            new UserPassword(createUserRequest.password),
        );
        return this.userRepositoryPort.create(command);
    }
}