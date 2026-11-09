import { User } from "../../../../../domain/models/user";
import { UserCreatedAt } from "../../../../../domain/models/value-objects/user-created-at";
import { UserEmail } from "../../../../../domain/models/value-objects/user-email";
import { UserId } from "../../../../../domain/models/value-objects/user-id";
import { UserLastAccess } from "../../../../../domain/models/value-objects/user-last-access";
import { UserName } from "../../../../../domain/models/value-objects/user-name";
import { UserPassword } from "../../../../../domain/models/value-objects/user-password";
import { UserRoles } from "../../../../../domain/models/value-objects/user-roles";
import { UserUpdatedAt } from "../../../../../domain/models/value-objects/user-updated-at";

export class MongoUserMapper {
    toDomain(user: {[key: string]: any}): User {
        const { id, name, email, password, roles, createdAt, updatedAt, lastAccess } = user;
        
        const userId = new UserId(id);
        const userName = new UserName(name);
        const userEmail = new UserEmail(email);
        const userPassword = new UserPassword(password);
        const userRoles = new UserRoles(roles);
        const userCreatedAt = new UserCreatedAt(createdAt);
        const userUpdatedAt = new UserUpdatedAt(updatedAt);
        const userLastAccess = new UserLastAccess(lastAccess);

        return new User(userId, userName, userEmail, userPassword, userRoles, userCreatedAt, userUpdatedAt, userLastAccess);
    }
}
    