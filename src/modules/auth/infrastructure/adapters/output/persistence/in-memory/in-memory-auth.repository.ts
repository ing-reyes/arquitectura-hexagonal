import { HttpStatus } from "../../../../../../../common/enums/http-status.enum";
import { ManagerError } from "../../../../../../../common/errors/manager.error";
import { ApiOneResponse } from "../../../../../../../common/interfaces/api-response.interface";
import { CreateUserCommand } from "../../../../../../user/domain/models/commands/create-user.command";
import { UserEmail } from "../../../../../../user/domain/models/value-objects/user-email";
import { UserName } from "../../../../../../user/domain/models/value-objects/user-name";
import { UserPassword } from "../../../../../../user/domain/models/value-objects/user-password";
import { InMemoryUserRepository } from "../../../../../../user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.repository";
import { Auth } from "../../../../../domain/models/auth";
import { SignInCommand } from "../../../../../domain/models/commands/sign-in.command";
import { SignUpCommand } from "../../../../../domain/models/commands/sign-up.command";
import { AuthRepositoryPort } from "../../../../../domain/ports/output/auth.repository";
import { InMemoryAuthMapper } from "./in-memory-auth.mapper";

export class InMemoryAuthRepository implements AuthRepositoryPort {
    
    constructor(
        private readonly inMemoryUserRepository: InMemoryUserRepository,
        private readonly mapper: InMemoryAuthMapper,
    ){}

    async signIn(command: SignInCommand): Promise<ApiOneResponse<Auth>> {
        try {
            const user = await this.inMemoryUserRepository.findOneByEmail(command.email);
            if (!user.data) throw ManagerError.badRequest('User not found');
            return {
                status: {
                    statusCode: HttpStatus.OK,
                    statusMsg: "OK",
                    error: null,
                },
                data: this.mapper.toDomain(user.data.mapToPrimitive()),
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async signUp(command: SignUpCommand): Promise<boolean> {
        try {
            const createUserCommand = new CreateUserCommand(
                new UserName(command.name.value),
                new UserEmail(command.email.value),
                new UserPassword(command.password.value),
            );
            const user = await this.inMemoryUserRepository.create(createUserCommand);
            if( !user ) return false;
            return true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}