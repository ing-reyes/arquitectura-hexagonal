import express from "express";
import { FactoryRoutes } from "./factory.route";

export class AppServer {
    private readonly app = express();

    constructor(
        private readonly factoryRoutes: FactoryRoutes,
    ){}

    start(port: number){
        //* Middlewares Globals
        this.app.use( express.json() );
        this.app.use( express.urlencoded({extended: true}) );

        //* Routes Globals
        this.app.use( this.factoryRoutes.routes );
        
        //* Listening Ports
        this.app.listen(port, ()=>{
            console.log(`Server running on port ${port}`)
        });
    }
}