import dotenv from 'dotenv';
import {
  ALONE_WITH_CONVERT,
  DEVICE,
  LOCATION,
  setupDb,
  setupWithData,
  testLocations,
} from '../../../test/test-utils';
import { DSL } from '../dsl';
import { DSLContext } from '../dsl.context';

dotenv.config();

describe('withDatabase', () => {
  setupDb(beforeAll, setupWithData);
  let create: DSLContext;
  beforeEach(() => {
    create = DSL.context({
      type: 'postgres',
      config: {
        connectionString: process.env.DATABASE_URL,
      },
    });
  });
  afterEach(async () => {
    await create.end();
  });
  describe('select', () => {
    it('select all fields from table', async () => {
      const locations = await create.selectFrom(LOCATION).fetch();
      expect(locations.length).toBe(3);
      const l = locations.find((l) => l.name === 'Limburg 1');
      expect(l).toBeTruthy();
      expect(l?.city).toBe('Limburg');
      expect(l?.postalCode).toBe('65551');
      expect(l?.street).toBe('Bahnhofstraße 37');
      expect(l?.note).toBe('test');
      expect(l?.start?.getTime()).toEqual(
        new Date('2007-12-24T18:21Z').getTime(),
      );
      expect(l?.tf).toBe(true);

      const l2 = locations.find((l) => l.name === 'Frankfurt 1234');
      expect(l2).toBeTruthy();
      expect(l2?.note).toBeUndefined();
    });
    it('select partial', async () => {
      const l = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .fetchOneOrThrow();
      expect(l).toBeTruthy();
      expect(l.id).not.toBeUndefined();
      expect(l.name).not.toBeUndefined();
      expect(Object.keys(l).length).toBe(2);
    });
    it('select partial and remap', async () => {
      const l = await create
        .select({
          id: LOCATION.id,
          rofl: LOCATION.name,
        })
        .from(LOCATION.table)
        .fetchOneOrThrow();
      expect(l).toBeTruthy();
      expect(l.id).not.toBeUndefined();
      expect(l.rofl).not.toBeUndefined();
      expect((l as any).name).toBeUndefined();
      expect(Object.keys(l).length).toBe(2);
    });

    it('select join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .join(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();

      expect(locations.length).toBe(7);
      const notFound = locations.find(
        (l) => l.name.indexOf('Frankfurt') !== -1,
      );
      expect(notFound).toBeUndefined();
    });
    it('select left outer join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .leftOuterJoin(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();

      expect(locations.length).toBe(8);
      const notFound = locations.find(
        (l) => l.name.indexOf('Frankfurt') !== -1,
      );
      expect(notFound).not.toBeUndefined();
    });
    it('select left outer join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .leftOuterJoin(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();

      expect(locations.length).toBe(8);
      const notFound = locations.find(
        (l) => l.name.indexOf('Frankfurt') !== -1,
      );
      expect(notFound).not.toBeUndefined();
    });
    it('select right outer join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .rightOuterJoin(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();

      expect(locations.length).toBe(7);
    });
    it('select full outer join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .fullOuterJoin(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();
      expect(locations.length).toBe(8);
    });
    it('select full outer join', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .fullOuterJoin(DEVICE.table)
        .on(LOCATION.id.eq(DEVICE.idLocation))
        .fetch();
      expect(locations.length).toBe(8);
    });
    it('select order', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .orderBy(LOCATION.name, 'desc')
        .fetch();
      expect(locations.length).toBe(3);
      const sortedLocations = [...testLocations].sort(
        (a, b) => a.name.localeCompare(b.name) * -1,
      );
      for (let i = 0; i < locations.length; i++) {
        expect(locations[i].name).toBe(sortedLocations[i].name);
      }
    });
    it('select order multiple', async () => {
      const locations = await create
        .select({
          id: LOCATION.id,
          name: LOCATION.name,
        })
        .from(LOCATION.table)
        .orderBy([
          { field: LOCATION.name, direction: 'desc' },
          { field: LOCATION.id },
        ])
        .fetch();
      expect(locations.length).toBe(3);
      const sortedLocations = [...testLocations].sort(
        (a, b) => a.name.localeCompare(b.name) * -1,
      );
      for (let i = 0; i < locations.length; i++) {
        expect(locations[i].name).toBe(sortedLocations[i].name);
      }
    });
    it('select single field', async () => {
      const locationsIds = await create
        .select(LOCATION.id)
        .from(LOCATION.table)
        .fetch();
      expect(locationsIds.length).toBe(3);
      for (const id of locationsIds) {
        expect(typeof id).toBe('number');
      }
    });

    it('select group', async () => {
      const counts = await create
        .select(DSL.count())
        .from(LOCATION.table)
        .groupBy(LOCATION.postalCode)
        .fetch();
      expect(counts.length).toBe(2);
      expect(counts.find((c) => c === 2)).toBeTruthy();
      expect(counts.find((c) => c === 1)).toBeTruthy();
    });
    it('select as', async () => {
      const countField = DSL.count().as('i_want_to_count');
      const counts = await create
        .select(countField)
        .from(LOCATION.table)
        .groupBy(LOCATION.postalCode)
        .orderBy(countField)
        .fetch();
      expect(counts.length).toBe(2);
      expect(counts[0]).toBe(1);
      expect(counts[1]).toBe(2);
    });
    it('select where like', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.name.like('Limburg%'))
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(2);
      expect(locations[0].name).toBe(testLocations[0].name);
      expect(locations[1].name).toBe(testLocations[1].name);
    });
    it('select where like not ignoring case', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.name.like('limburg%')) //limburg is normally written with a big L
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(0);
    });
    it('select where ilike is ignoring case', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.name.ilike('limburg%')) //limburg is normally written with a big L
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(2);
      expect(locations[0].name).toBe(testLocations[0].name);
      expect(locations[1].name).toBe(testLocations[1].name);
    });
    it('select where eq object', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where({
          postalCode: '65551',
        })
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(2);
      expect(locations[0].name).toBe(testLocations[0].name);
      expect(locations[1].name).toBe(testLocations[1].name);
    });
    it('select where object different operator', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(
          {
            name: 'limburg%',
          },
          'ILIKE',
        )
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(2);
      expect(locations[0].name).toBe(testLocations[0].name);
      expect(locations[1].name).toBe(testLocations[1].name);
    });
    it('select where in', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(
          LOCATION.id.in(create.select(DEVICE.idLocation).from(DEVICE.table)),
        )
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(2);
      expect(locations[0].name).toBe(testLocations[0].name);
      expect(locations[1].name).toBe(testLocations[1].name);
    });
    it('select where or', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.name.ilike('limbu%'))
        .or(LOCATION.postalCode.eq('069'))
        .orderBy(LOCATION.id)
        .fetch();
      expect(locations.length).toBe(3);
    });
    it('select where as table single field', async () => {
      const devices = create
        .select(DEVICE.idLocation)
        .from(DEVICE.table)
        .asTable('t1');
      const locations = await create
        .select({
          id: LOCATION.id,
          idFromDevice: devices.value,
        })
        .from(LOCATION.table)
        .join(devices.table)
        .on(LOCATION.id.eq(devices.value))
        .orderBy(LOCATION.id)
        .fetch();

      expect(locations.length).toBe(7);
      for (const location of locations) {
        expect(location.id).not.toBeUndefined();
        expect(location.idFromDevice).not.toBeUndefined();
        expect(location.id).toBe(location.idFromDevice);
      }
    });
    it('select where as table multiple field', async () => {
      const devices = create
        .select({
          idLocation: DEVICE.idLocation,
          name: DEVICE.name,
        })
        .from(DEVICE.table)
        .asTable('t1');
      const locations = await create
        .select({
          id: LOCATION.id,
          idFromDevice: devices.idLocation,
          name: devices.name,
        })
        .from(LOCATION.table)
        .join(devices.table)
        .on(LOCATION.id.eq(devices.idLocation))
        .orderBy(LOCATION.id)
        .fetch();

      expect(locations.length).toBe(7);
      for (const location of locations) {
        expect(location.id).not.toBeUndefined();
        expect(location.idFromDevice).not.toBeUndefined();
        expect(location.id).toBe(location.idFromDevice);
        expect(location.name.indexOf('dev') === 0);
      }
    });
    it('select in array', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.id.in([testLocations[0].id]))
        .fetch();
      expect(locations.length).toBe(1);
    });
    it('select in array multiple', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.id.in([testLocations[0].id, testLocations[1].id]))
        .fetch();
      expect(locations.length).toBe(2);
    });
    it('select in array strign', async () => {
      const locations = await create
        .selectFrom(LOCATION)
        .where(LOCATION.name.in([testLocations[0].name, testLocations[1].name]))
        .fetch();
      expect(locations.length).toBe(2);
    });
    it('select in array strign', async () => {
      const sql = create
        .selectFrom(ALONE_WITH_CONVERT)
        .where(ALONE_WITH_CONVERT.name.eq(1))
        .toSql(create.options);
      expect(sql).toContain(`"name" = 'a'`);
    });
    it('select where in map field', async () => {
      const sql = create
        .selectFrom(ALONE_WITH_CONVERT)
        .where(ALONE_WITH_CONVERT.name.in([0, 1]))
        .toSql(create.options);
      expect(sql).toContain(`'b'`);
      expect(sql).toContain(`'a'`);
    });
    it('should select with date in where clause', async () => {
      const result = await create
        .selectFrom(LOCATION)
        .where(LOCATION.start.lessOrEqual(new Date()))
        .fetch();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
