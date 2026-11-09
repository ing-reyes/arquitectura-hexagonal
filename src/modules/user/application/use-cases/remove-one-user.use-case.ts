import { UserRepositoryPort } from "../../domain/ports/output/user-repository.port";
import { UserId } from "../../domain/models/value-objects/user-id";

interface UseCase{
    execute( id: string ): Promise<boolean>;
}

export class RemoveUserUseCase implements UseCase {
    constructor( private readonly userRepositoryPort: UserRepositoryPort ){}

    execute(id: string): Promise<boolean> {
        const userId = new UserId(id);
        return this.userRepositoryPort.remove( userId );
    }
}