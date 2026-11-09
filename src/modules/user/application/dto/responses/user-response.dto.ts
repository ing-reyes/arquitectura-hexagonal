import { Roles } from "../../../../../common/enums/user-roles.enum";
import { User } from "../../../domain/models/user";

/**
 * DTO de salida de usuarios. Nunca incluye la contraseña (ni su hash):
 * los datos de credenciales no deben salir del adaptador de persistencia.
 */
export class UserPrimitiveResponse {
    constructor(
        public id: string,
        public name: string,
        public email: string,
        public roles: Roles[],
        public createdAt: Date,
        public updatedAt: Date,
        public lastAccess: Date,
    ) { }

    static fromDomain(user: User): UserPrimitiveResponse {
        const primitive = user.mapToPrimitive();

        return new UserPrimitiveResponse(
            primitive.id,
            primitive.name,
            primitive.email,
            primitive.roles,
            primitive.createdAt,
            primitive.updatedAt,
            primitive.lastAccess,
        );
    }
}
