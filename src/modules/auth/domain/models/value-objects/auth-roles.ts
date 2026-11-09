import { Roles } from "../../../../../common/enums/user-roles.enum";
import { ManagerError } from "../../../../../common/errors/manager.error";

export class AuthRoles {
    constructor(
        public readonly value: Roles[],
    ){
        this.validate();
    }

    validate(): void {
        if (this.value.length === 0) {
            throw ManagerError.badRequest('Roles is required');
        }
    }
}