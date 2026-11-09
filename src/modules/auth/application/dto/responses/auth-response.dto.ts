import { Roles } from "../../../../../common/enums/user-roles.enum";

export class AuthPrimitiveResponse {
    constructor(
        public user: {
            id: string,
            name: string,
            email: string,
            roles: Roles[],
        },
        public token: string,
    ){}   
}