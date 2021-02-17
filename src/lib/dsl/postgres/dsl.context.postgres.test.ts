import { DSL } from '../dsl';
import { Table } from '../../table';
import { Converter } from '../../field/field-tools';

class UnknownForTsooq {}

interface Location {
  id: number;
  name: string;
  city?: string;
  street?: string;
  postalCode?: string | number;
  note?: string;
  start?: Date;
  tf: boolean;
  dunno: UnknownForTsooq;
}

const unknownForTsooqConverter: Converter<string, UnknownForTsooq> = {
  fromDb(_value: string): UnknownForTsooq {
    return {} as any;
  },
  toDb(_value: UnknownForTsooq): string {
    return {} as any;
  },
};

const LOCATION = DSL.tableDefinition<Location>(
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
      dunno: table.field('dunno', unknownForTsooqConverter),
    });
  },
);

export interface Device {
  mac: string;
  name: string;
  test: number;
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

describe('withDatabase', () => {
  describe('select', () => {
    const connection = 'postgres://postgres:development@localhost:5432/tsooq';
    const create = DSL.context({
      type: 'postgres',
      config: {
        connectionString: connection,
      },
    });
    it('shouldSelect', async () => {
      const locations: Location[] = await create.selectFrom(LOCATION).fetch();
      console.log(locations);
      const lul = await create
        .selectFrom(LOCATION)
        .join(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .where({
          id: 5,
        })
        .and(DEVICE.mac.eq('asdfsdf'))
        .fetch();
    });
  });
});
