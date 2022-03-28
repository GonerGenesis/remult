import { Field, Entity, IdEntity, Fields } from 'remult';

@Entity("Categories", {
    allowApiCrud: true,
})
export class Categories extends IdEntity {
    @Fields.String()
    name: string;
}