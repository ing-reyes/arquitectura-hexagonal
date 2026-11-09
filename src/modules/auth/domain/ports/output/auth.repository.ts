import { ApiOneResponse } from "../../../../../common/interfaces/api-response.interface";
import { Auth } from "../../models/auth";
import { SignInCommand } from "../../models/commands/sign-in.command";
import { SignUpCommand } from "../../models/commands/sign-up.command";

export interface AuthRepositoryPort {
    signIn(command: SignInCommand): Promise<ApiOneResponse<Auth>>;
    signUp(command: SignUpCommand): Promise<boolean>;
}