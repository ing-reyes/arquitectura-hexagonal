import { Roles } from "../../../../../common/enums/user-roles.enum";

export class UserPrimitiveResponse {
    constructor(
        public id: string,
        public name: string,
        public email: string,
        public password: string,
        public roles: Roles[],
        public createdAt: Date,
        public updatedAt: Date,
        public lastAccess: Date,
    ){}
}