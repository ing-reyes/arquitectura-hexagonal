import { ManagerError } from "../../../../../common/errors/manager.error";

export class AuthName {
    constructor(
        public readonly value: string,
    ){
        this.validate();
    }

    validate(): void {
        if (this.value.length < 2) {
            throw ManagerError.badRequest('Name must be at least 2 characters long');
        }
    }
}