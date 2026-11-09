import { addErrorDto } from "../../../../../common/errors/add.error";

export class SignInRequest {

    constructor(
        public email: string, 
        public password: string
    ) {}

    static validate( data: {[key: string]: any} ): [ Record<string, string[]> | undefined, SignInRequest | undefined  ]{
        const { email, password } = data;
        let errors: Record<string, string[]> = {}

        if(!email){
            errors = addErrorDto('email', 'Email is required', errors);
        }

        if(!password){
            errors = addErrorDto('password', 'Password is required', errors);
        }

        if(Object.keys(errors).length > 0){
            return [errors, undefined];
        }

        return [undefined, new SignInRequest(email, password)];
    }
}