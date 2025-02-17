import { createId } from '@paralleldrive/cuid2'
import { v4 as uuid } from 'uuid'
import type { ClassType } from '../../classType.js'
import type { FieldOptions } from '../column-interfaces.js'
import type { Remult } from '../context.js'
import type {
  FindOptions,
  RelationOptions,
  ClassFieldDecorator,
  ClassFieldDecoratorContextStub,
} from './remult3.js'
import { ValueConverters } from '../valueConverters.js'
import { buildOptions } from './RepositoryImplementation.js'
import type { columnInfo } from './columnInfo.js'
import { Validators } from '../validators.js'
import { relationInfoMemberInOptions } from './relationInfoMember.js'
import { remultStatic } from '../remult-static.js'

export class Fields {
  /**
   * Stored as a JSON.stringify - to store as json use Fields.json
   */
  static object<entityType = any, valueType = any>(
    ...options: (
      | FieldOptions<entityType, valueType>
      | ((options: FieldOptions<entityType, valueType>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, valueType | undefined> {
    return Field(undefined, ...options)
  }
  static json<entityType = any, valueType = any>(
    ...options: (
      | FieldOptions<entityType, valueType>
      | ((options: FieldOptions<entityType, valueType>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, valueType | undefined> {
    let op = options as FieldOptions<any, valueType>
    if (op.valueConverter && !op.valueConverter.fieldTypeInDb)
      //@ts-ignore
      op.valueConverter.fieldTypeInDb = 'json'

    return Field(
      undefined,
      {
        valueConverter: {
          fieldTypeInDb: 'json',
        },
      },
      ...options,
    )
  }
  static dateOnly<entityType = any>(
    ...options: (
      | FieldOptions<entityType, Date>
      | ((options: FieldOptions<entityType, Date>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, Date | undefined> {
    return Field(
      () => Date,
      {
        valueConverter: ValueConverters.DateOnly,
      },
      ...options,
    )
  }
  static date<entityType = any>(
    ...options: (
      | FieldOptions<entityType, Date>
      | ((options: FieldOptions<entityType, Date>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, Date | undefined> {
    return Field(() => Date, ...options)
  }
  static integer<entityType = any>(
    ...options: (
      | FieldOptions<entityType, number>
      | ((options: FieldOptions<entityType, number>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, number | undefined> {
    return Field(
      () => Number,
      {
        valueConverter: ValueConverters.Integer,
      },
      ...options,
    )
  }
  static autoIncrement<entityType = any>(
    ...options: (
      | FieldOptions<entityType, number>
      | ((options: FieldOptions<entityType, number>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, number | undefined> {
    return Field(
      () => Number,
      {
        allowApiUpdate: false,
        dbReadOnly: true,
        valueConverter: {
          ...ValueConverters.Integer,
          fieldTypeInDb: 'autoincrement',
        },
      },
      ...options,
    )
  }

  static number<entityType = any>(
    ...options: (
      | FieldOptions<entityType, number>
      | ((options: FieldOptions<entityType, number>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, number | undefined> {
    return Field(() => Number, ...options)
  }
  static createdAt<entityType = any>(
    ...options: (
      | FieldOptions<entityType, Date>
      | ((options: FieldOptions<entityType, Date>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, Date | undefined> {
    return Field(
      () => Date,
      {
        allowApiUpdate: false,
        saving: (_, ref, { isNew }) => {
          if (isNew) ref.value = new Date()
        },
      },
      ...options,
    )
  }
  static updatedAt<entityType = any>(
    ...options: (
      | FieldOptions<entityType, Date>
      | ((options: FieldOptions<entityType, Date>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, Date | undefined> {
    return Field(
      () => Date,
      {
        allowApiUpdate: false,
        saving: (_, ref) => {
          ref.value = new Date()
        },
      },
      ...options,
    )
  }

  static uuid<entityType = any>(
    ...options: (
      | FieldOptions<entityType, string>
      | ((options: FieldOptions<entityType, string>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, string | undefined> {
    return Field(
      () => String,
      {
        allowApiUpdate: false,
        defaultValue: () => uuid(),
        saving: (_, r) => {
          if (!r.value) r.value = uuid()
        },
      },
      ...options,
    )
  }
  static cuid<entityType = any>(
    ...options: (
      | FieldOptions<entityType, string>
      | ((options: FieldOptions<entityType, string>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, string | undefined> {
    return Field(
      () => String,
      {
        allowApiUpdate: false,
        defaultValue: () => createId(),
        saving: (_, r) => {
          if (!r.value) r.value = createId()
        },
      },
      ...options,
    )
  }
  static string<entityType = any>(
    ...options: (
      | StringFieldOptions<entityType>
      | ((options: StringFieldOptions<entityType>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, string | undefined> {
    return Field(() => String, ...options)
  }
  static boolean<entityType = any>(
    ...options: (
      | FieldOptions<entityType, boolean>
      | ((options: FieldOptions<entityType, boolean>, remult: Remult) => void)
    )[]
  ): ClassFieldDecorator<entityType, boolean | undefined> {
    return Field(() => Boolean, ...options)
  }
}
export class Relations {
  /**
   * Define a to-one relation between entities, indicating a one-to-one relationship.
   * If no field or fields are provided, it will automatically create a field in the database
   * to represent the relation.
   *
   * @param toEntityType A function that returns the target entity type.
   * @param options (Optional): An object containing options for configuring the to-one relation.
   * @returns A decorator function to apply the to-one relation to an entity field.
   *
   * Example usage:
   * ```
   * @Relations.toOne(() => Customer)
   * customer?: Customer;
   * ```
   * ```
   * Fields.string()
   * customerId?: string;
   *
   * @Relations.toOne(() => Customer, "customerId")
   * customer?: Customer;
   * ```
   * ```
   * Fields.string()
   * customerId?: string;
   *
   * @Relations.toOne(() => Customer, {
   *   field: "customerId",
   *   defaultIncluded: true
   * })
   * customer?: Customer;
   * ```
   * ```
   * Fields.string()
   * customerId?: string;
   *
   * @Relations.toOne(() => Customer, {
   *   fields: {
   *     customerId: "id",
   *   },
   * })
   * customer?: Customer;
   * ```
   */
  static toOne<entityType, toEntityType>(
    toEntityType: () => ClassType<toEntityType>,
    options?:
      | (FieldOptions<entityType, toEntityType> &
          Pick<
            RelationOptions<entityType, toEntityType, any, any>,
            'defaultIncluded'
          >)
      | RelationOptions<entityType, toEntityType, entityType>
      | keyof entityType,
  ): (
    target: any,
    context: string | ClassFieldDecoratorContextStub<any, toEntityType>,
    c?: any,
  ) => void {
    let op: RelationOptions<entityType, toEntityType, entityType> =
      (typeof options === 'string'
        ? { field: options }
        : !options
        ? {}
        : options) as any as RelationOptions<
        entityType,
        toEntityType,
        entityType
      >

    if (!op.field && !op.fields && !op.findOptions)
      //@ts-ignore
      return Field(toEntityType, {
        ...op,
        ...relationInfoMemberInOptions(toEntityType, 'reference'),
      })

    return Field(() => undefined!, {
      ...op,
      serverExpression: () => undefined,
      ...relationInfoMemberInOptions(toEntityType, 'toOne'),
    })
  }
  /**
   * Define a toMany relation between entities, indicating a one-to-many relationship.
   * This method allows you to establish a relationship where one entity can have multiple related entities.
   *
   * @param toEntityType A function that returns the target entity type.
   * @param fieldInToEntity (Optional) The field in the target entity that represents the relation.
   *                       Use this if you want to specify a custom field name for the relation.
   * @returns A decorator function to apply the toMany relation to an entity field.
   *
   * Example usage:
   * ```
   * @Relations.toMany(() => Order)
   * orders?: Order[];
   *
   * // or with a custom field name:
   * @Relations.toMany(() => Order, "customerId")
   * orders?: Order[];
   * ```
   */
  static toMany<entityType, toEntityType>(
    toEntityType: () => ClassType<toEntityType>,
    fieldInToEntity?: keyof toEntityType,
  ): ClassFieldDecorator<entityType, toEntityType[] | undefined>

  /**
   * Define a toMany relation between entities, indicating a one-to-many relationship.
   * This method allows you to establish a relationship where one entity can have multiple related entities.
   * You can also specify various options to customize the relation and control related data retrieval.
   *
   * @param toEntityType A function that returns the target entity type.
   * @param options An object containing options for configuring the toMany relation.
   *                - field (Optional): The field in the target entity that represents the relation.
   *                  Use this if you want to specify a custom field name for the relation.
   *                - findOptions (Optional): Customize the options for finding related entities.
   *                  You can set limits, order, where conditions, and more.
   * @returns A decorator function to apply the toMany relation to an entity field.
   *
   * Example usage:
   * ```
   * @Relations.toMany(() => Order, {
   *   field: "customerOrders",
   *   findOptions: {
   *     limit: 10,
   *     orderBy: { amount: "desc" },
   *     where: { completed: true },
   *   },
   * })
   * orders?: Order[];
   * ```
   */
  static toMany<entityType, toEntityType>(
    toEntityType: () => ClassType<toEntityType>,
    options: RelationOptions<
      entityType,
      toEntityType,
      toEntityType,
      FindOptions<toEntityType>
    >,
  ): ClassFieldDecorator<entityType, toEntityType[] | undefined>

  static toMany<entityType, toEntityType>(
    toEntityType: () => ClassType<toEntityType>,
    options?:
      | RelationOptions<
          entityType,
          toEntityType,
          toEntityType,
          FindOptions<toEntityType>
        >
      | keyof toEntityType,
  ) {
    let op: RelationOptions<
      entityType,
      toEntityType,
      toEntityType,
      FindOptions<toEntityType>
    > = (typeof options === 'string'
      ? { field: options }
      : options) as any as RelationOptions<
      entityType,
      toEntityType,
      toEntityType,
      FindOptions<toEntityType>
    >
    return Field(() => undefined!, {
      ...op,
      serverExpression: () => undefined,
      ...relationInfoMemberInOptions(toEntityType, 'toMany'),
    })
  }
}

/**Decorates fields that should be used as fields.
 * for more info see: [Field Types](https://remult.dev/docs/field-types.html)
 *
 * FieldOptions can be set in two ways:
 * @example
 * // as an object
 * @Fields.string({ includeInApi:false })
 * title='';
 * @example
 * // as an arrow function that receives `remult` as a parameter
 * @Fields.string((options,remult) => options.includeInApi = true)
 * title='';
 */
export function Field<entityType = any, valueType = any>(
  valueType:
    | (() => valueType extends number
        ? Number
        : valueType extends string
        ? String
        : valueType extends boolean
        ? Boolean
        : ClassType<valueType>)
    | undefined,
  ...options: (
    | FieldOptions<entityType, valueType>
    | ((options: FieldOptions<entityType, valueType>, remult: Remult) => void)
  )[]
) {
  // import ANT!!!! if you call this in another decorator, make sure to set It's return type correctly with the | undefined

  return (
    target,
    context:
      | ClassFieldDecoratorContextStub<entityType, valueType | undefined>
      | string,
    c?,
  ) => {
    const key = typeof context === 'string' ? context : context.name.toString()
    let factory = (remult: Remult) => {
      let r = buildOptions(options, remult)
      if (r.required) {
        r.validate = addValidator(r.validate, Validators.required)
      }
      if ((r as StringFieldOptions).maxLength) {
        r.validate = addValidator(
          r.validate,
          Validators.maxLength((r as StringFieldOptions).maxLength!),
        )
      }
      if (!r.valueType && valueType) {
        r.valueType = valueType()
      }
      if (!r.key) {
        r.key = key
      }
      if (!r.dbName) r.dbName = r.key
      let type = r.valueType
      if (!type) {
        type =
          typeof Reflect.getMetadata == 'function'
            ? Reflect.getMetadata('design:type', target, key)
            : []
        r.valueType = type
      }
      if (!r.target) r.target = target
      return r
    }
    checkTarget(target)
    let names: columnInfo[] = remultStatic.columnsOfType.get(
      target.constructor,
    )!
    if (!names) {
      names = []
      remultStatic.columnsOfType.set(target.constructor, names)
    }

    let set = names.find((x) => x.key == key)
    if (!set)
      names.push({
        key,
        settings: factory,
      })
    else {
      let prev = set.settings
      set.settings = (c) => {
        let prevO = prev(c)
        let curr = factory(c)
        return Object.assign(prevO, curr)
      }
    }
  }
}

export interface StringFieldOptions<entityType = any>
  extends FieldOptions<entityType, string> {
  maxLength?: number
}
export function checkTarget(target: any) {
  if (!target)
    throw new Error(
      "Set the 'experimentalDecorators:true' option in your 'tsconfig' or 'jsconfig' (target undefined)",
    )
}
function addValidator(
  validators: FieldOptions['validate'],
  newValidator: FieldOptions['validate'],
  atStart = false,
) {
  if (!newValidator) return
  const newValidators = Array.isArray(newValidator)
    ? newValidator
    : [newValidator]
  const validatorsArray = Array.isArray(validators)
    ? validators
    : validators
    ? [validators]
    : []
  return atStart
    ? [...newValidators, ...validatorsArray]
    : [...validatorsArray, ...newValidators]
}
