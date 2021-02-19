import { Client } from 'pg';

import {
  Device,
  DEVICE,
  LOCATION,
  setupDb,
  setupWithData,
  testDevices,
  testLocations,
} from '../../../test/test-utils';
import { DSL } from '../dsl';
import { DSLContext } from '../dsl.context';

describe('update', () => {
  setupDb(beforeEach, setupWithData);
  let create: DSLContext;
  let client: Client;
  beforeEach(async () => {
    create = DSL.context({
      type: 'postgres',
      config: {
        connectionString: process.env.DATABASE_URL,
      },
    });
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();
  });
  afterEach(async () => {
    await create.end();
    await client.end();
  });
  it('update without where', async () => {
    await create
      .update(DEVICE, {
        name: 'hallo',
      })
      .execute();
    const list: Device[] = (await client.query('select * from device'))
      .rows as Device[];
    for (const device of list) {
      expect(device.name).toBe('hallo');
    }
  });
  it('update with where', async () => {
    await create
      .update(DEVICE, {
        name: 'hallo',
      })
      .where(DEVICE.mac.eq(testDevices[0].mac))
      .execute();
    const list: Device[] = (await client.query('select * from device'))
      .rows as Device[];
    const changed = list.find((device) => device.mac === testDevices[0].mac);
    expect(changed).toBeTruthy();
    expect(changed?.name).toBe('hallo');
    const unchanged = list.filter(
      (device) => device.mac !== testDevices[0].mac,
    );
    for (const device of unchanged) {
      expect(device.name).not.toBe('hallo');
    }
  });
  it('update with from', async () => {
    await create
      .update(DEVICE, {
        name: LOCATION.name,
      })
      .from(LOCATION.table)
      .where(DEVICE.idLocation.eq(LOCATION.id))
      .execute();
    const list: Device[] = (await client.query('select * from device'))
      .rows as Device[];
    for (const device of list) {
      expect(device.name).toBe(
        testLocations.find((l) => l.id === device.idLocation)?.name,
      );
    }
  });
  it('update with from and join', async () => {
    const t1 = create.selectFrom(DEVICE).asTable('t1');
    await create
      .update(DEVICE, {
        name: LOCATION.name,
      })
      .from(LOCATION.table)
      .leftJoin(t1.table)
      .on(LOCATION.id.eq(t1.idLocation))
      .where(DEVICE.idLocation.eq(LOCATION.id))
      .execute();
    const list: Device[] = (await client.query('select * from device'))
      .rows as Device[];
    for (const device of list) {
      expect(device.name).toBe(
        testLocations.find((l) => l.id === device.idLocation)?.name,
      );
    }
  });
  it('update returning', async () => {
    const list = await create
      .update(DEVICE, {
        name: 'hallo',
      })
      .where(DEVICE.mac.eq(testDevices[0].mac))
      .returning()
      .fetch();
    expect(list.length).toBe(1);
    expect(Object.keys(list[0]).length).toBe(1);
    expect(list[0].name);
  });
  it('update set null', async () => {
    expect(testDevices[0].test).not.toBeUndefined();
    const list = await create
      .update(DEVICE, {
        test: undefined,
      })
      .where(DEVICE.mac.eq(testDevices[0].mac))
      .returning()
      .fetch();
    expect(list.length).toBe(1);
    expect(list[0].test).toBeUndefined();
  });
});
