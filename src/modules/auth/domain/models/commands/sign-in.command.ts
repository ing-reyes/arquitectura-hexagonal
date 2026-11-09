import { AuthEmail } from "../value-objects/auth-email";
import { AuthPassword } from "../value-objects/auth-password";

export class SignInCommand {
    constructor(
        public email: AuthEmail,
        public password: AuthPassword,
    ) { }
}