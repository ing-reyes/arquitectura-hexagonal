import { ManagerError } from "../../../../../common/errors/manager.error";

export class UserId {
    constructor(
        public readonly value: string,
    ){
        this.validate();
    }
    
    validate(): void {
        if (!this.value) {
            throw ManagerError.badRequest('Id is required');
        }
    }
}