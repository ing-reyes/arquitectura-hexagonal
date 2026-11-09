import { Roles } from "../../../../../common/enums/user-roles.enum";
import { ManagerError } from "../../../../../common/errors/manager.error";

export class UserRoles {
    constructor(
        public readonly value: Roles[],
    ){
        this.validate();
    }

    validate(): void {
        if ( !Array.isArray(this.value) ) {
            throw ManagerError.badRequest('Roles must be an array');
        }

        if (!this.value.every(role => Object.values(Roles).includes(role)) ) {
            throw ManagerError.badRequest('Invalid role');
        }

        if (this.value.length === 0) {
            throw ManagerError.badRequest('At least one role must be assigned');
        }
    }
}