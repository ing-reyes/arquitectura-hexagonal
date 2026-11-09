import { PaginationDto } from "../../../../common/dtos/pagination/pagination.dto";
import { ApiAllResponse } from "../../../../common/interfaces/api-response.interface";
import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { UserPrimitiveResponse } from "../dto/responses/user-response.dto";

interface UseCase{
    execute( paginationDto: PaginationDto ): Promise<ApiAllResponse<UserPrimitiveResponse>>;
}

export class FindAllUserUseCase implements UseCase {
    constructor( private readonly userRepositoryPort: UserRepositoryPort ){}

    async execute(paginationDto: PaginationDto): Promise<ApiAllResponse<UserPrimitiveResponse>> {
        const response = await this.userRepositoryPort.findAll( paginationDto ); 
        return {
            ...response,
            data: response.data.map((user) => UserPrimitiveResponse.fromDomain(user)),
        }
    }
}