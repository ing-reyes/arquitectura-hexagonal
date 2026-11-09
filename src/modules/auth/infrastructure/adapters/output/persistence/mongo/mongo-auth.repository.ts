import { BcryptConfig } from "../../../../../../../common/config/bcrypt.config";
import { ManagerError } from "../../../../../../../common/errors/manager.error";
import { ApiOneResponse } from "../../../../../../../common/interfaces/api-response.interface";
import { CreateUserCommand } from "../../../../../../user/domain/models/commands/create-user.command";
import { UserEmail } from "../../../../../../user/domain/models/value-objects/user-email";
import { UserName } from "../../../../../../user/domain/models/value-objects/user-name";
import { UserPassword } from "../../../../../../user/domain/models/value-objects/user-password";
import { UserRepositoryPort } from "../../../../../../user/domain/ports/output/user-repository.port";
import { Auth } from "../../../../../domain/models/auth";
import { SignInCommand } from "../../../../../domain/models/commands/sign-in.command";
import { SignUpCommand } from "../../../../../domain/models/commands/sign-up.command";
import { AuthRepositoryPort } from "../../../../../domain/ports/output/auth.repository";
import { MongoAuthMapper } from "./mongo-auth.mapper";

export class MongoAuthRepository implements AuthRepositoryPort {
    constructor(
        private readonly userRepositoryPort: UserRepositoryPort,
        private readonly mapper: MongoAuthMapper,
        private readonly bcryptConfig: BcryptConfig,
    ) { }

    async signIn(command: SignInCommand): Promise<ApiOneResponse<Auth>> {
        try {
            const user = await this.userRepositoryPort.findOneByEmail(command.email);
            if (!user.data) throw ManagerError.badRequest("User not found");

            const isValidPassword = this.bcryptConfig.comparePassword(
                command.password.value,
                user.data.password.value,
            );
            if (!isValidPassword) throw ManagerError.badRequest("Invalid credentials");

            return {
                status: user.status,
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

            return await this.userRepositoryPort.create(createUserCommand);
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}
