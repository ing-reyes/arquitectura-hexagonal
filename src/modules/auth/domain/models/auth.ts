import { AuthEmail } from "./value-objects/auth-email";
import { AuthName } from "./value-objects/auth-name";
import { AuthPassword } from "./value-objects/auth-password";
import { AuthRoles } from "./value-objects/auth-roles";

export class Auth {
    constructor(
        public id: AuthName,
        public name: AuthName,
        public email: AuthEmail,
        public password: AuthPassword,
        public roles: AuthRoles,
    ) { }

    public mapToPrimitive(){
        return {
            id: this.id.value,
            name: this.name.value,
            email: this.email.value,
            password: this.password.value,
            roles: this.roles.value,
        }
    }
}