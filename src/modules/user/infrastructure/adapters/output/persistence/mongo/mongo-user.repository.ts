import { ApiOneResponse, ApiAllResponse } from '../../../../../../../common/interfaces/api-response.interface';
import { BcryptConfig } from '../../../../../../../common/config/bcrypt.config';
import { HttpStatus } from '../../../../../../../common/enums/http-status.enum';
import { PaginationDto } from '../../../../../../../common/dtos/pagination/pagination.dto';
import { User } from '../../../../../domain/models/user';
import { UserRepositoryPort } from '../../../../../domain/ports/output/user-repository.port';
import { UserDocument } from './mongo-user.model';
import { MongoUserMapper } from './mongo-user.mapper';
import { Model } from 'mongoose';
import { CreateUserCommand } from '../../../../../domain/models/commands/create-user.command';
import { UpdateUserCommand } from '../../../../../domain/models/commands/update-user.command';
import { UserId } from '../../../../../domain/models/value-objects/user-id';

export class MongoUserRepository implements UserRepositoryPort {
    constructor(
        private readonly userModel: Model<UserDocument>,
        private readonly mapper: MongoUserMapper,
        private readonly bcryptConfig: BcryptConfig,
    ) { }
    async create(createUserCommand: CreateUserCommand): Promise<boolean> {
        const { password, email, name } = createUserCommand;
        try {
            const user = await this.userModel.create({
                name: name.value,
                email: email.value,
                password: this.bcryptConfig.hashPassword(password.value),
            });
            if (!user) return false;

            await user.save();

            return true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async update(id: UserId, updateUserCommand: UpdateUserCommand): Promise<boolean> {
        const { password, email, name } = updateUserCommand;
        try {
            const updateData: any = {};
            
            if (email) updateData.email = email.value;
            if (name) updateData.name = name.value;
            if (password) {
                // If you want to hash the password before saving
                updateData.password = this.bcryptConfig.hashPassword(password.value);
            }
    
            const result = await this.userModel.findByIdAndUpdate(
                id.value, 
                { $set: updateData },
                { new: true }
            );
            
            if (!result) return false;
            return true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async findOne(id: UserId): Promise<ApiOneResponse<User | null>> {
        try {
            const user = await this.userModel.findById(id.value);

            return {
                status: {
                    statusCode: HttpStatus.OK,
                    statusMsg: 'OK',
                    error: null
                },
                data: (user) ? this.mapper.toDomain(user) : null,
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async findAll(paginationDto: PaginationDto): Promise<ApiAllResponse<User>> {
        const { limit = 10, page = 1 } = paginationDto;
        const skip = (page - 1) * limit;
        try {
            const [users, total] = await Promise.all([
                this.userModel.find().skip(skip).limit(limit),
                this.userModel.countDocuments(),
            ]);

            const lastPage = Math.ceil(total / limit);
            return {
                status: {
                    statusCode: HttpStatus.OK,
                    statusMsg: 'OK',
                    error: null,
                },
                meta: {
                    total,
                    page,
                    lastPage,
                    limit,
                },
                data: users.map((user) => this.mapper.toDomain(user)),
            };
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
    async remove(id: UserId): Promise<boolean> {
        try {
            const result = await this.userModel.findByIdAndDelete(id.value);
            if (!result) return false;

            return true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}