import { Auth } from "../../../../../domain/models/auth";
import { AuthEmail } from "../../../../../domain/models/value-objects/auth-email";
import { AuthId } from "../../../../../domain/models/value-objects/auth-id";
import { AuthName } from "../../../../../domain/models/value-objects/auth-name";
import { AuthPassword } from "../../../../../domain/models/value-objects/auth-password";
import { AuthRoles } from "../../../../../domain/models/value-objects/auth-roles";

export class MongoAuthMapper {
    public toDomain(user: { [key: string]: any }): Auth {
        const { id, name, email, password, roles } = user;

        return new Auth(
            new AuthId(id),
            new AuthName(name),
            new AuthEmail(email),
            new AuthPassword(password),
            new AuthRoles(roles),
        );
    }
}
