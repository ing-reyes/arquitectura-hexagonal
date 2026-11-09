import { UserCreatedAt } from "./value-objects/user-created-at";
import { UserEmail } from "./value-objects/user-email";
import { UserId } from "./value-objects/user-id";
import { UserLastAccess } from "./value-objects/user-last-access";
import { UserName } from "./value-objects/user-name";
import { UserPassword } from "./value-objects/user-password";
import { UserRoles } from "./value-objects/user-roles";
import { UserUpdatedAt } from "./value-objects/user-updated-at";

export class User {
    constructor(
        public id: UserId,
        public name: UserName,
        public email: UserEmail,
        public password: UserPassword,
        public roles: UserRoles,
        public createdAt: UserCreatedAt,
        public updatedAt: UserUpdatedAt,
        public lastAccess: UserLastAccess,
    ) { }

    public mapToPrimitive() {
        return {
            id: this.id.value,
            name: this.name.value,
            email: this.email.value,
            password: this.password.value,
            roles: this.roles.value,
            createdAt: this.createdAt.value,
            updatedAt: this.updatedAt.value,
            lastAccess: this.lastAccess.value,
        }
    }
}