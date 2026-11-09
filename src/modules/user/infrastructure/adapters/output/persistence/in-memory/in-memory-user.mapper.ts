import { User } from "../../../../../domain/models/user";
import { UserId } from "../../../../../domain/models/value-objects/user-id";
import { UserRoles } from "../../../../../domain/models/value-objects/user-roles";
import { UserCreatedAt } from "../../../../../domain/models/value-objects/user-created-at";
import { UserUpdatedAt } from "../../../../../domain/models/value-objects/user-updated-at";
import { UserLastAccess } from "../../../../../domain/models/value-objects/user-last-access";
import { UserName } from "../../../../../domain/models/value-objects/user-name";
import { UserEmail } from "../../../../../domain/models/value-objects/user-email";
import { UserPassword } from "../../../../../domain/models/value-objects/user-password";

export class InMemoryUserMapper {
    public toDomain( user: {[key: string]: any} ): User{
        const { id, name, email, password, roles, createdAt, updatedAt, lastAccess } = user;

        return new User(
            new UserId(id),
            new UserName(name),
            new UserEmail(email),
            new UserPassword(password),
            new UserRoles(roles),
            new UserCreatedAt(createdAt),
            new UserUpdatedAt(updatedAt),
            new UserLastAccess(lastAccess),
        )
    }
}