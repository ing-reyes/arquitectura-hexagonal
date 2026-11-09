import { ManagerError } from "../../../../../common/errors/manager.error";

export class AuthPassword {
    constructor(
        public readonly value: string,
    ){
        this.validate();
    }
    
    validate(): void {
        if (this.value.length < 6) {
            throw ManagerError.badRequest('Password must be at least 6 characters long');
        }
    }
}