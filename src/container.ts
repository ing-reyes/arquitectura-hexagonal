import { BcryptConfig } from "./common/config/bcrypt.config";
import { envs } from "./common/config/envs.config";
import { MongoDB } from "./common/databases/mongodb/mongo-connect";
import { Handler } from "./common/errors/handler.error";
import { FactoryRoutes } from "./factory.route";
import { CreateUserUseCase } from "./modules/user/application/use-cases/create-user.use-case";
import { FindAllUserUseCase } from "./modules/user/application/use-cases/find-all-user.use-case";
import { FindOneUserUseCase } from "./modules/user/application/use-cases/find-one-user.use-case";
import { RemoveUserUseCase } from "./modules/user/application/use-cases/remove-one-user.use-case";
import { UpdateUserUseCase } from "./modules/user/application/use-cases/update-user.use-case";
import { MongoUserRepository } from "./modules/user/infrastructure/adapters/output/persistence/mongo/mongo-user.repository";
import { UserController } from "./modules/user/infrastructure/adapters/input/http/controllers/user.controller";
import { UserRoutes } from "./modules/user/infrastructure/adapters/input/http/routes/user.route";
import { AppServer } from "./server";
import { UserModel } from "./modules/user/infrastructure/adapters/output/persistence/mongo/mongo-user.model";
import { MongoUserMapper } from "./modules/user/infrastructure/adapters/output/persistence/mongo/mongo-user.mapper";
import { InMemoryUserRepository } from "./modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.repository";
import { InMemoryUserMapper } from "./modules/user/infrastructure/adapters/output/persistence/in-memory/in-memory-user.mapper";
import { AuthRoutes } from "./modules/auth/infrastructure/adapters/input/http/routes/auth.route";
import { AuthController } from "./modules/auth/infrastructure/adapters/input/http/controllers/auth.controller";
import { SignInUseCase } from "./modules/auth/application/use-cases/sign-in.use-case";
import { InMemoryAuthRepository } from "./modules/auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.repository";
import { InMemoryAuthMapper } from "./modules/auth/infrastructure/adapters/output/persistence/in-memory/in-memory-auth.mapper";
import { SignUpUseCase } from "./modules/auth/application/use-cases/sign-up.use-case";
import { JwtConfig } from "./common/config/jwt.config";

const bcryptConfig = new BcryptConfig();
const mongoUserModel = UserModel;
const mongoUserMapper = new MongoUserMapper();

// const mongoUserRepository = new MongoUserRepository(
//     mongoUserModel,
//     mongoUserMapper,
//     bcryptConfig,
// );
const inMemoryUserMapper = new InMemoryUserMapper()
const inMemoryUserRepository = new InMemoryUserRepository(inMemoryUserMapper)

const createUserUseCase = new CreateUserUseCase(inMemoryUserRepository);
const updateUserUseCase = new UpdateUserUseCase(inMemoryUserRepository);
const findOneUserUseCase = new FindOneUserUseCase(inMemoryUserRepository);
const findAllUserUseCase = new FindAllUserUseCase(inMemoryUserRepository);
const removeUserUseCase = new RemoveUserUseCase(inMemoryUserRepository);

export const handlerError = new Handler();

//* User
export const userController = new UserController(
    createUserUseCase,
    updateUserUseCase,
    findOneUserUseCase,
    findAllUserUseCase,
    removeUserUseCase, 
    handlerError
);
export const userRoutes = new UserRoutes(userController);

//* Auth
const jwtConfig = new JwtConfig();
const inMemoryAuthMapper = new InMemoryAuthMapper()
const inMemoryAuthRepository = new InMemoryAuthRepository(inMemoryUserRepository, inMemoryAuthMapper)

const signInUseCase = new SignInUseCase( inMemoryAuthRepository, jwtConfig )
const signUpUseCase = new SignUpUseCase( inMemoryAuthRepository )

const authController = new AuthController( signInUseCase, signUpUseCase, handlerError );

export const authRoutes = new AuthRoutes(authController);

//* Server
export const factoryRoutes = new FactoryRoutes(userRoutes, authRoutes);
export const server = new AppServer(factoryRoutes);

export const mongodb = new MongoDB( { mongoUrl: envs.MONGO_URL, dbName: envs.MONGO_DB_NAME } );