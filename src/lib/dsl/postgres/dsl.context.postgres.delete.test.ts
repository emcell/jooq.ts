import dotenv from 'dotenv';
import { Client } from 'pg';
import {
  DEVICE,
  Device,
  setupDb,
  setupWithData,
  testDevices,
} from '../../../test/test-utils';
import { DSL } from '../dsl';
import { DSLContext } from '../dsl.context';
dotenv.config();

describe('delete', () => {
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
  it('delete all', async () => {
    let list = (await client.query('select * from device')).rows as Device[];
    expect(list.length).toBeGreaterThan(0);
    await create.delete(DEVICE.table).execute();
    list = (await client.query('select * from device')).rows as Device[];
    expect(list.length).toBe(0);
  });
  it('delete where', async () => {
    let list = (await client.query('select * from device')).rows as Device[];
    expect(list.length).toBe(testDevices.length);
    await create
      .delete(DEVICE.table)
      .where(DEVICE.mac.eq(testDevices[0].mac))
      .execute();
    list = (await client.query('select * from device')).rows as Device[];
    expect(list.length).toBe(testDevices.length - 1);
  });
  it('delete returning', async () => {
    const list = await create
      .delete(DEVICE.table)
      .where(DEVICE.mac.eq(testDevices[0].mac))
      .returning(DEVICE.fields)
      .fetch();
    expect(list.length).toBe(1);
    expect(list[0]).toStrictEqual(testDevices[0]);
  });
});
