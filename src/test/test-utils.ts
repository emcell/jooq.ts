import dotenv from 'dotenv';
import { reset } from 'graphile-migrate';
import { Client } from 'pg';
import { Except } from 'type-fest';
import { FieldTable } from '..';
import { DSL } from '../lib/dsl/dsl';
import { Table, TableRaw } from '../lib/table';

export interface Alone {
  id: number;
  name: string;
  date?: Date;
  bool?: boolean;
}

interface InformationSchemaViews {
  tableCatalog: string;
  tableSchema: string;
  tableName: string;
  viewDefinition: string;
}

export const INFORMATION_SCHEMA_VIEWS = DSL.tableDefinition<InformationSchemaViews>(
  new TableRaw('information_schema.views'),
  (table) => {
    return {
      tableCatalog: new FieldTable<string>(table, 'table_catalog'),
      tableSchema: new FieldTable<string>(table, 'table_schema'),
      tableName: new FieldTable<string>(table, 'table_name'),
      viewDefinition: new FieldTable<string>(table, 'view_definition'),
    };
  },
);

export const ALONE = DSL.tableDefinition<Alone>(
  new Table('alone'),
  (table, fields) => {
    return fields({
      id: table.field('id'),
      name: table.field('name'),
      date: table.field('date'),
      bool: table.field('bool'),
    });
  },
);

export type AloneWithConvert = Except<Alone, 'name'> & { name: number };
export const ALONE_WITH_CONVERT = DSL.tableDefinition<AloneWithConvert>(
  new Table('alone'),
  (table) => {
    return {
      id: table.field('id'),
      name: DSL.tableField<AloneWithConvert, number, string>(table, 'name', {
        fromDb: (value: string): number => {
          if (value == 'a') {
            return 1;
          }
          return 2;
        },
        toDb: (value: number): string => {
          if (value === 1) return 'a';
          return 'b';
        },
      }),
      date: table.field('date'),
      bool: table.field('bool'),
    };
  },
);

export interface Location {
  id: number;
  name: string;
  city?: string;
  street?: string;
  postalCode?: string;
  note?: string;
  start?: Date;
  tf: boolean;
}

export const LOCATION = DSL.tableDefinition<Location>(
  new Table('location'),
  (table, fields) => {
    return fields({
      id: table.field('id'),
      name: table.field('name'),
      city: table.field('city'),
      street: table.field('street'),
      postalCode: table.field('postalCode'),
      note: table.field('note'),
      start: table.field('start'),
      tf: table.field('tf'),
    });
  },
);

export interface Device {
  mac: string;
  name: string;
  test?: number;
  idLocation: number;
}

export const DEVICE = DSL.tableDefinition<Device>(
  new Table('device'),
  (table) => {
    return {
      mac: table.field('mac'),
      name: table.field('name'),
      test: table.field('test'),
      idLocation: table.field('idLocation'),
    };
  },
);

export async function clean(): Promise<void> {
  await reset({
    rootConnectionString: process.env.ROOT_DATABASE_URL,
  });
}

export function setupDb(
  lifeCycle: jest.Lifecycle,
  setupFunction: (pg: Client) => Promise<void>,
): void {
  lifeCycle(async () => {
    dotenv.config();
    await clean();
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await client.connect();
      await setupFunction(client);
    } finally {
      await client.end();
    }
  });
}

export const testLocations: Location[] = [
  {
    id: 1,
    name: 'Limburg 1',
    city: 'Limburg',
    street: 'Bahnhofstraße 37',
    postalCode: '65551',
    note: 'test',
    start: new Date('2007-12-24T18:21Z'),
    tf: true,
  },
  {
    id: 2,
    name: 'Limburg 2',
    city: 'Limburg',
    street: 'Rübsangerstraße 12',
    postalCode: '65551',
    tf: false,
  },
  {
    id: 3,
    name: 'Frankfurt 1234',
    city: 'Frankfurt',
    street: 'kenn ich net 14',
    postalCode: '069',
    tf: false,
  },
];

export const testDevices: Device[] = [
  {
    mac: '001122334400',
    name: 'dev_0',
    test: 0,
    idLocation: testLocations[0].id,
  },
  {
    mac: '001122334401',
    name: 'dev_1',
    test: 1,
    idLocation: testLocations[0].id,
  },
  {
    mac: '001122334402',
    name: 'dev_2',
    test: 2,
    idLocation: testLocations[0].id,
  },
  {
    mac: '001122334403',
    name: 'dev_3',
    idLocation: testLocations[1].id,
  },
  {
    mac: '001122334404',
    name: 'dev_4',
    test: 4,
    idLocation: testLocations[1].id,
  },
  {
    mac: '001122334405',
    name: 'dev_5',
    test: 5,
    idLocation: testLocations[1].id,
  },
  {
    mac: '001122334406',
    name: 'dev_6',
    test: 6,
    idLocation: testLocations[1].id,
  },
];

export async function testSchema(pg: Client): Promise<void> {
  await pg.query(`
  create table location (
    id serial not null primary key,
    name text not null,
    city text,
    street text,
    "postalCode" text,
    "note" text,
    start timestamp without time zone,
    tf boolean not null default false
  );`);
  await pg.query(`
  create table device (
    mac text not null primary key,
    name text not null,
    "test" int,
    "idLocation" int not null
  );`);
  await pg.query(`
  create table alone (
    id serial not null primary key,
    name text not null,
    "date" timestamp without time zone,
    "bool" boolean
  );`);
}

export function stringOrNull(value?: string) {
  if (value !== undefined) return `'${value}'`;
  return 'null';
}

export function numberOrNull(value?: number) {
  if (value !== undefined) return `${value}`;
  return 'null';
}

export function dateOrNull(value?: Date) {
  if (value !== undefined) return `'${value.toUTCString()}'`;
  return 'null';
}

export async function setupWithData(pg: Client) {
  await testSchema(pg);

  await pg.query(`
    insert into location (id, name, city, street, "postalCode", "note", start, tf)
    values
    ${testLocations
      .map(
        (l) =>
          `(${l.id}, '${l.name}', ${stringOrNull(l.city)}, ${stringOrNull(
            l.street,
          )}, ${stringOrNull(l.postalCode)}, ${stringOrNull(
            l.note,
          )}, ${dateOrNull(l.start)}, ${l.tf})`,
      )
      .join(',')}
    returning *;
  `);
  await pg.query(`
  insert into device (mac, name, test, "idLocation")
  values
  ${testDevices
    .map(
      (d) =>
        `(${stringOrNull(d.mac)}, ${stringOrNull(d.name)}, ${numberOrNull(
          d.test,
        )}, ${numberOrNull(d.idLocation)})`,
    )
    .join(',')}

`);
}
