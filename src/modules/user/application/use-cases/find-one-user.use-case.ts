import { ApiOneResponse } from "../../../../common/interfaces/api-response.interface";
import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { UserId } from "../../domain/models/value-objects/user-id";
import { UserPrimitiveResponse } from "../dto/responses/user-response.dto";

interface UseCase{
    execute( id: string ): Promise<ApiOneResponse<UserPrimitiveResponse | null>>;
}

export class FindOneUserUseCase implements UseCase {
    constructor( private readonly userRepositoryPort: UserRepositoryPort ){}

    async execute(id: string): Promise<ApiOneResponse<UserPrimitiveResponse | null>> {
        const userId = new UserId(id);
        const response = await this.userRepositoryPort.findOne(userId);
        return {
            ...response,
            data: response.data ? UserPrimitiveResponse.fromDomain(response.data) : null,
        }
    }
}