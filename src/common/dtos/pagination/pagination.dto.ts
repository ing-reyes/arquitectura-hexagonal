import { addErrorDto } from "../../errors/add.error";

export class PaginationDto {
    constructor(
        public page: number,
        public limit: number,
    ){}

    static validate(query: {[key: string]: any}): [Record<string, string[]> | undefined, PaginationDto | undefined]{
        const { page = 1, limit = 10 } = query;
        let errors: Record<string, string[]> = {}
        
        if( Number.isNaN( +page ) ){
            errors = addErrorDto("page", "Page mast be a number", errors);
        }

        if( Number.isNaN( +limit ) ){
            errors = addErrorDto("limit", "Limit mast be a number", errors);
        }

        if( Object.keys(errors).length>0 ){
            return [errors, undefined];
        }

        return [undefined, new PaginationDto(+page, +limit)];
    }
}