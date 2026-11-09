import { ManagerError } from "../../../../../common/errors/manager.error";

export class UserEmail {
    constructor(
        public readonly value: string,
    ){
        this.validate();
    }
    
    validate(): void {
        if (!this.value.includes('@')) {
            throw ManagerError.badRequest('Email is not valid');
        }
    }
}