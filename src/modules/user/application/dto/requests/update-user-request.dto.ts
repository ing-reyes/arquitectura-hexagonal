import { addErrorDto } from "../../../../../common/errors/add.error";

export class UpdateUserRequest {
    constructor(
        public name?: string,
        public email?: string,
        public password?: string,
    ){}

    static validate(data: {[key: string]: any}): [Record<string, string[]> | undefined, UpdateUserRequest | undefined]{
        const { name, email, password } = data;

        let errors: Record<string, string[]> = {}

        if( name === undefined && email === undefined && password === undefined ){
            errors = addErrorDto("body", "At least one of name, email or password is required", errors);
        }

        if( name !== undefined && (typeof name !== "string" || !name.length) ){
            errors = addErrorDto("name", "Name must be a non-empty string", errors);
        }

        if( email !== undefined && (typeof email !== "string" || !email.length) ){
            errors = addErrorDto("email", "Email must be a non-empty string", errors);
        }

        if( password !== undefined && (typeof password !== "string" || !password.length) ){
            errors = addErrorDto("password", "Password must be a non-empty string", errors);
        }

        if( Object.keys(errors).length>0 ){
            return [errors, undefined];
        }

        return [undefined, new UpdateUserRequest(name, email, password)];
    }
}
