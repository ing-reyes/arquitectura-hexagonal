import { Request, Response } from "express";
import { Handler } from "../../../../../../../common/errors/handler.error";
import { SignInUseCase } from "../../../../../application/use-cases/sign-in.use-case";
import { SignUpUseCase } from "../../../../../application/use-cases/sign-up.use-case";
import { SignInRequest } from "../../../../../application/dto/requests/sign-in-request.dto";
import { SignUpRequest } from "../../../../../application/dto/requests/sign-up-request.dto";

export class AuthController {
    constructor( 
        private readonly signInUseCase: SignInUseCase, 
        private readonly signUpUseCase: SignUpUseCase, 
        private readonly handlerError: Handler 
    ){}

    signIn = ( req: Request, res: Response )=>{
        const [errors, signInRequest] = SignInRequest.validate(req.body)
        if(errors){
            return res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: Object.values(errors).flat(2)}) 
        }
        //* UseCase
        this.signInUseCase.execute(signInRequest!)
        .then((user)=>res.status(200).json(user))
        .catch((err)=>this.handlerError.error(err, res));
    }

    signUp = ( req: Request, res: Response )=>{
        const [errors, signUpRequest] = SignUpRequest.validate(req.body)
        if(errors){
            return res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: Object.values(errors).flat(2)}) 
        }
        //* UseCase
        this.signUpUseCase.execute(signUpRequest!)
        .then((user)=>res.status(201).json(user))
        .catch((err)=>this.handlerError.error(err, res));
    }
}