import * as jwt from "jsonwebtoken";
import { envs } from "./envs.config";

const SEED = envs.JWT_SECRET; 

export class JwtConfig{
    async generateToken( payload: Object, duration:string = '2h' ):Promise<string|null>{
        return new Promise( ( resolve ) => {
            jwt.sign( payload, SEED, { expiresIn: duration } as jwt.SignOptions, ( error, token ) => {
                
                if( error ) return resolve( null );
    
                return resolve( token! );
            } );
        });
    }

    async validateToken<T>( token: string ):Promise<T|null>{
        return new Promise( ( resolve ) => {
            jwt.verify( token, SEED, (error, decoded)=>{
                if( error ) return resolve( null );
    
                return resolve( decoded as T );
            } );
        });
    }

    async renewToken( token: string ): Promise<string|null>{
        const payload = await this.validateToken<{id:string}>( token );
        if( !payload ) return null;
        
        return this.generateToken( { id: payload.id } );
    }
}