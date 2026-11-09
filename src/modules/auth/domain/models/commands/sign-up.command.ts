import { AuthEmail } from "../value-objects/auth-email";
import { AuthName } from "../value-objects/auth-name";
import { AuthPassword } from "../value-objects/auth-password";

export class SignUpCommand {
    constructor(
        public name: AuthName,
        public email: AuthEmail,
        public password: AuthPassword,
    ) { }
}