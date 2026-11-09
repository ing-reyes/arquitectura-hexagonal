/**
 * User registration use case for the authentication module.
 *
 * Author: Eng. Luis Reyes
 * Context: Application layer; coordinates the creation of value objects and
 *          registration through AuthRepositoryPort.
 * Input: SignUpRequest with a name, email address, and password.
 * Output: Promise<boolean> indicating the result of the registration.
 * Last modified: 2025-03-08
 */

import { SignUpCommand } from "../../domain/models/commands/sign-up.command";
import { AuthEmail } from "../../domain/models/value-objects/auth-email";
import { AuthName } from "../../domain/models/value-objects/auth-name";
import { AuthPassword } from "../../domain/models/value-objects/auth-password";
import { AuthRepositoryPort } from "../../domain/ports/output/auth.repository";
import { SignUpRequest } from "../dto/requests/sign-up-request.dto";

interface UseCase {
    execute: (signUpRequest: SignUpRequest) => Promise<boolean>
}

export class SignUpUseCase implements UseCase {
    constructor(
        private readonly authRepository: AuthRepositoryPort,
    ) { }

    async execute(signUpRequest: SignUpRequest): Promise<boolean> {
        const command = new SignUpCommand(
            new AuthName(signUpRequest.name),
            new AuthEmail(signUpRequest.email),
            new AuthPassword(signUpRequest.password),
        );
        return this.authRepository.signUp(command);
    }
}