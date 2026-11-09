import { ManagerError } from "../../../../../common/errors/manager.error";

export class UserUpdatedAt {
    constructor(
        public readonly value: Date,
    ){
        this.validate();
    }
    
    validate(): void {
        if (!this.value) {
            throw ManagerError.badRequest('CreatedAt at is required');
        }
    }
}