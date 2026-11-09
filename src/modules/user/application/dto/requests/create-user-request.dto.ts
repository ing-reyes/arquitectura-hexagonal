import { addErrorDto } from "../../../../../common/errors/add.error";

export class CreateUserRequest {
    constructor(
        public name: string,
        public email: string,
        public password: string,
    ){}

    static validate(data: {[key: string]: any}): [Record<string, string[]> | undefined, CreateUserRequest | undefined]{
        const { name, email, password } = data;

        let errors: Record<string, string[]> = {}

        if( !name ){
            errors = addErrorDto("name", "Name is required", errors);
        }

        if( !email ){
            errors = addErrorDto("email", "Email is required", errors);
        }

        if( !password ){
            errors = addErrorDto("password", "Password is required", errors);
        }

        if( Object.keys(errors).length>0 ){
            return [errors, undefined];
        }

        return [undefined, new CreateUserRequest(name, email, password)];
    }
}
