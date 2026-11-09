import { BcryptConfig } from "./common/config/bcrypt.config";
import { envs } from "./common/config/envs.config";
import { JwtConfig } from "./common/config/jwt.config";
import { MongoDB } from "./common/databases/mongodb/mongo-connect";
import { Handler } from "./common/errors/handler.error";
import { AuthMiddleware } from "./common/middlewares/auth.middleware";
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
import { AuthRoutes } from "./modules/auth/infrastructure/adapters/input/http/routes/auth.route";
import { AuthController } from "./modules/auth/infrastructure/adapters/input/http/controllers/auth.controller";
import { SignInUseCase } from "./modules/auth/application/use-cases/sign-in.use-case";
import { SignUpUseCase } from "./modules/auth/application/use-cases/sign-up.use-case";
import { MongoAuthRepository } from "./modules/auth/infrastructure/adapters/output/persistence/mongo/mongo-auth.repository";
import { MongoAuthMapper } from "./modules/auth/infrastructure/adapters/output/persistence/mongo/mongo-auth.mapper";

//* Infraestructura transversal
const bcryptConfig = new BcryptConfig();
const jwtConfig = new JwtConfig();
export const handlerError = new Handler();
const authMiddleware = new AuthMiddleware(jwtConfig, handlerError);

//* Adaptador de salida activo (MongoDB)
//* Para usar memoria: sustituir por `new InMemoryUserRepository(new InMemoryUserMapper())`
export const mongoUserModel = UserModel;
export const userRepository = new MongoUserRepository(
    mongoUserModel,
    new MongoUserMapper(),
    bcryptConfig,
);

//* User: casos de uso (dependen solo del puerto)
const createUserUseCase = new CreateUserUseCase(userRepository);
const updateUserUseCase = new UpdateUserUseCase(userRepository);
const findOneUserUseCase = new FindOneUserUseCase(userRepository);
const findAllUserUseCase = new FindAllUserUseCase(userRepository);
const removeUserUseCase = new RemoveUserUseCase(userRepository);

//* User: adaptador de entrada
export const userController = new UserController(
    createUserUseCase,
    updateUserUseCase,
    findOneUserUseCase,
    findAllUserUseCase,
    removeUserUseCase,
    handlerError,
);
export const userRoutes = new UserRoutes(userController, authMiddleware);

//* Auth: adaptador de salida + casos de uso
const authRepository = new MongoAuthRepository(userRepository, new MongoAuthMapper(), bcryptConfig);
const signInUseCase = new SignInUseCase(authRepository, jwtConfig);
const signUpUseCase = new SignUpUseCase(authRepository);

//* Auth: adaptador de entrada
const authController = new AuthController(signInUseCase, signUpUseCase, handlerError);
export const authRoutes = new AuthRoutes(authController);

//* Composición del servidor
export const factoryRoutes = new FactoryRoutes(userRoutes, authRoutes);
export const server = new AppServer(factoryRoutes);

//* Conexión a la base de datos
export const mongodb = new MongoDB({ mongoUrl: envs.MONGO_URL, dbName: envs.MONGO_DB_NAME });
