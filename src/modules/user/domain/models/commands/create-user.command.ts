import { UserEmail } from "../value-objects/user-email";
import { UserPassword } from "../value-objects/user-password";
import { UserName } from "../value-objects/user-name";

export class CreateUserCommand {
    constructor(
        public readonly name: UserName,
        public readonly email: UserEmail,
        public readonly password: UserPassword,
    ) { }
}