import { ManagerError } from "../../../../../common/errors/manager.error";

export class UserLastAccess {
    constructor(
        public readonly value: Date,
    ){
        this.validate();
    }
    
    validate(): void {
        if (!this.value) {
            throw ManagerError.badRequest('LastAccess at is required');
        }
    }
}