export class Validators {

    static isEmail(email: string): boolean {
        const regex = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/gi;
        return regex.test(email);
    }

    static isMongoId(id: string): boolean {
        const regex = /^[0-9a-fA-F]{24}$/;
        return regex.test(id);
    }
}