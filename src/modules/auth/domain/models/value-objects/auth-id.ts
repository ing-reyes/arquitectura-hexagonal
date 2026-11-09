import { ManagerError } from "../../../../../common/errors/manager.error";

export class AuthId {
    constructor(
        public readonly value: string,
    ){
        this.validate();
    }

    validate(): void {
        if (this.value.length === 0) {
            throw ManagerError.badRequest('Token is required');
        }
    }
}