import { Request, Response } from "express";
import { Handler } from "../../../../../../../common/errors/handler.error";
import { PaginationDto } from '../../../../../../../common/dtos/pagination/pagination.dto';
import { CreateUserUseCase } from "../../../../../application/use-cases/create-user.use-case";
import { FindOneUserUseCase } from '../../../../../application/use-cases/find-one-user.use-case';
import { FindAllUserUseCase } from "../../../../../application/use-cases/find-all-user.use-case";
import { UpdateUserUseCase } from "../../../../../application/use-cases/update-user.use-case";
import { RemoveUserUseCase } from "../../../../../application/use-cases/remove-one-user.use-case";
import { Validators } from "../../../../../../../common/config/validators.config";
import { CreateUserRequest } from '../../../../../application/dto/requests/create-user-request.dto';
import { UpdateUserRequest } from '../../../../../application/dto/requests/update-user-request.dto';

export class UserController {
    constructor( 
        private readonly createUserUseCase: CreateUserUseCase,
        private readonly updateUserUseCase: UpdateUserUseCase,
        private readonly findOneUserUseCase: FindOneUserUseCase,
        private readonly findAllUserUseCase: FindAllUserUseCase,
        private readonly removeUserUseCase: RemoveUserUseCase,
        private readonly handlerError: Handler,
    ){}

    create = ( req: Request, res: Response ) => {
        const [errors, createUserRequest] = CreateUserRequest.validate(req.body)
        if(errors){
            return res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: Object.values(errors).flat(2)});
        }
        //* Use Case
        this.createUserUseCase.execute(createUserRequest!)
        .then((user)=>res.status(201).json(user))
        .catch((err)=>this.handlerError.error(err, res));
    }

    findOne = ( req: Request, res: Response ) => {
        const id = req.params.id as string;
        const isMongoId = Validators.isMongoId(id);
        if(!isMongoId){
            res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: [`The id ${id} is not a valid MongoID`]});
            return;
        }
        //* Use Case
        this.findOneUserUseCase.execute(id)
        .then((user)=>res.status(200).json(user) )
        .catch((err)=>this.handlerError.error(err, res));
    }

    findAll = ( req: Request, res: Response ) => {
        const [errors, paginationDto] = PaginationDto.validate(req.query);
        if(errors){
            res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: Object.values(errors).flat(2)});
            return;
        }

        //* Use Case
        this.findAllUserUseCase.execute(paginationDto!)
        .then((user)=>res.status(200).json(user) )
        .catch((err)=>this.handlerError.error(err, res));
    }

    update = ( req: Request, res: Response ) => {
        const id = req.params.id as string;
        const isMongoId = Validators.isMongoId(id);
        if(!isMongoId){
            res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: [`The id ${id} is not a valid MongoID`]});
            return;
        }
        const [errors, updateUserRequest] = UpdateUserRequest.validate(req.body)
        if(errors){
            return res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: Object.values(errors).flat(2)});
        }
        //* Use Case
        this.updateUserUseCase.execute(id, updateUserRequest!)
        .then((user)=>res.status(200).json(user))
        .catch((err)=>this.handlerError.error(err, res));
    }

    remove = ( req: Request, res: Response ) => {
        const id = req.params.id as string;
        const isMongoId = Validators.isMongoId(id);
        if(!isMongoId){
            res.status(400).json({statusCode: 400, statusMsg: "BAD_REQUEST", errors: [`The id ${id} is not a valid MongoID`]});
            return;
        }
        //* Use Case
        this.removeUserUseCase.execute(id)
        .then((user)=>res.status(200).json(user))
        .catch((err)=>this.handlerError.error(err, res));
    }
}