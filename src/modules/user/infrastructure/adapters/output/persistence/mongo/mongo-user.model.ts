import mongoose, { Schema } from "mongoose";
import { Roles } from "../../../../../../../common/enums/user-roles.enum";

export interface UserDocument extends mongoose.Document {
    name: string;
    email: string;
    password: string;
    roles: Roles[];
    createdAt: Date;
    updatedAt: Date;
    lastAccess: Date;
}

const userSchema = new Schema<UserDocument>({
    name: {
        type: String,
        require: [true, "Name is required"],
    },
    email: {
        type: String,
        unique: true,
        require: [true, "Email is required"],
    },
    password: {
        type: String,
        require: [true, "Password is required"],
    },
    roles: {
        type: [String],
        enum: Object.values(Roles),
        default: [Roles.USER],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    lastAccess: {
        type: Date,
        default: Date.now,
    },
});


export const UserModel = mongoose.model("User", userSchema);