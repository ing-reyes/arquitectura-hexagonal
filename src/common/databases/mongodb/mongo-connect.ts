import mongoose from "mongoose";

interface Options {
    mongoUrl: string,
    dbName: string,
}

export class MongoDB {
    constructor( private readonly options: Options ){}

    async connect(){
        const { dbName, mongoUrl } = this.options;
        try {
            await mongoose.connect( mongoUrl, { dbName } );
            console.log("Mongo Connected");
            return true;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}