import dotenv from 'dotenv';
import { Client } from 'pg';
import format from 'pg-format';
import {
  ALONE,
  Alone,
  AloneWithConvert,
  ALONE_WITH_CONVERT,
  setupDb,
  testSchema,
} from '../../../test/test-utils';
import { UniqueConstraintException } from '../../exceptions';
import { Table } from '../../table';
import { DSL } from '../dsl';
import { DSLContext } from '../dsl.context';

const testAlone: Alone[] = [
  {
    id: 1,
    name: 'alone_1',
    date: new Date('2007-12-24T18:21Z'),
    bool: true,
  },
  {
    id: 2,
    name: 'alone_2',
  },
];

dotenv.config();

describe('withDatabase', () => {
  setupDb(beforeEach, testSchema);
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
  describe('insert', () => {
    it('simple', async () => {
      const alone = testAlone[0];
      await create.insertInto(ALONE, [alone]).execute();
      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(1);
      expect(list[0]).toStrictEqual(alone);
    });
    it('multiple', async () => {
      await create.insertInto(ALONE, testAlone).execute();
      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(2);
      list.sort((a, b) => a.id - b.id);
      expect(list[0]).toStrictEqual(testAlone[0]);
      const alone = list[1];
      expect(alone.id).toStrictEqual(testAlone[1].id);
      expect(alone.name).toStrictEqual(testAlone[1].name);
      expect(alone.date).toBeNull();
      expect(alone.bool).toBeNull();
    });
    it('simple returning', async () => {
      const alone = testAlone[0];
      const list = await create.insertInto(ALONE, [alone]).returning().fetch();
      expect(list.length).toBe(1);
      expect(list[0]).toStrictEqual(alone);
    });
    it('simple returning with single fields', async () => {
      const list = await create
        .insertInto(ALONE, testAlone)
        .returning(ALONE.id)
        .fetch();
      expect(list.length).toBe(testAlone.length);
      for (const id of list) {
        expect(typeof id).toBe('number');
      }
    });
    it('simple returning with multiple fields', async () => {
      const list = await create
        .insertInto(ALONE, testAlone)
        .returning(ALONE.fields)
        .fetch();
      expect(list.length).toBe(testAlone.length);
      list.sort((a, b) => a.id - b.id);
      expect(list).toStrictEqual(testAlone);
    });
    it('simple returning with multiple fields but less then all', async () => {
      const list = await create
        .insertInto(ALONE, testAlone)
        .returning({
          id: ALONE.id,
          name: ALONE.name,
        })
        .fetch();
      expect(list.length).toBe(testAlone.length);
      list.sort((a, b) => a.id - b.id);
      for (let i = 0; i < list.length; i++) {
        expect(list[i].id).toBe(testAlone[i].id);
        expect(list[i].name).toBe(testAlone[i].name);
      }
    });
    it('on conflict do nothing with no parameter given', async () => {
      const alone = testAlone[0];
      await create.insertInto(ALONE, [testAlone[0]]).execute();
      await create
        .insertInto(ALONE, [{ ...testAlone[1], id: testAlone[0].id }])
        .onConflictDoNothing()
        .execute();
      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(1);
      expect(list[0]).toStrictEqual(alone);
    });
    it('on conflict do nothing', async () => {
      const alone = testAlone[0];
      await create.insertInto(ALONE, [testAlone[0]]).execute();
      await create
        .insertInto(ALONE, [{ ...testAlone[1], id: testAlone[0].id }])
        .onConflict('id')
        .doNothing()
        .execute();
      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(1);
      expect(list[0]).toStrictEqual(alone);
    });
    it('on conflict do update all', async () => {
      const ins = { ...testAlone[1], id: testAlone[0].id };
      await create.insertInto(ALONE, [testAlone[0]]).execute();

      await create
        .insertInto(ALONE, [ins])
        .onConflict('id')
        .doUpdate()
        .setExcluded()
        .execute();

      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(ins.id);
      expect(list[0].name).toBe(ins.name);
      expect(list[0].date).toBe(null);
      expect(list[0].bool).toBe(null);
    });
    it('on conflict do specified', async () => {
      const ins = { ...testAlone[1], id: testAlone[0].id };
      await create.insertInto(ALONE, [testAlone[0]]).execute();

      await create
        .insertInto(ALONE, [ins])
        .onConflict('id')
        .doUpdate()
        .set({
          name: 'rofl',
          date: DSL.excluded(), //automatically use "date" as fieldname
          bool: DSL.excluded('bool'),
        })
        .execute();

      const list: Alone[] = (await client.query('select * from alone'))
        .rows as Alone[];
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(ins.id);
      expect(list[0].name).toBe('rofl');
      expect(list[0].date).toBe(null);
      expect(list[0].bool).toBe(null);
    });
    it('on conflict with returning', async () => {
      const ins = { ...testAlone[1], id: testAlone[0].id };
      await create.insertInto(ALONE, [testAlone[0]]).execute();

      const list = await create
        .insertInto(ALONE, [ins])
        .onConflict('id')
        .doUpdate()
        .set({
          name: 'rofl',
          date: DSL.excluded(), //automatically use "date" as fieldname
          bool: DSL.excluded('bool'),
        })
        .returning()
        .fetch();

      expect(list.length).toBe(1);
      expect(list[0].id).toBe(ins.id);
      expect(list[0].name).toBe('rofl');
      expect(list[0].date).toBeUndefined();
      expect(list[0].bool).toBeUndefined();
    });
    it('with select', async () => {
      await create.insertInto(ALONE, testAlone).execute();

      const list = await create
        .insertInto(
          ALONE,
          create
            .select({
              ...ALONE.fields,
              id: ALONE.id.add(100),
            })
            .from(ALONE.table),
        )
        .returning()
        .fetch();
      list.sort((a, b) => a.id - b.id);
      expect(list.length).toBe(2);
      for (let i = 0; i < list.length; i++) {
        expect(list[i].id).toBe(testAlone[i].id + 100);
        expect(list[i].name).toBe(testAlone[i].name);
        expect(list[i].date?.getTime()).toBe(testAlone[i].date?.getTime());
        expect(list[i].bool).toBe(testAlone[i].bool);
      }
    });
    it('with fields as values', async () => {
      await create
        .insertInto<Alone>(ALONE, [
          {
            ...testAlone[0],
            date: DSL.now(),
          },
        ])
        .execute();
    });
    it('with converter', async () => {
      await create
        .insertInto<AloneWithConvert>(ALONE_WITH_CONVERT, [
          {
            id: 1,
            name: 1,
            bool: true,
            date: DSL.now(),
          },
        ])
        .execute();
    });
    it('throws on conflict UniqueConstraintException', async () => {
      await create
        .insertInto<Alone>(ALONE, [
          {
            id: 1,
            name: '',
            bool: true,
            date: DSL.now(),
          },
        ])
        .execute();
      try {
        await create
          .insertInto<Alone>(ALONE, [
            {
              id: 1,
              name: 'a',
              bool: false,
              date: DSL.now(),
            },
          ])
          .execute();
      } catch (e) {
        expect(e instanceof UniqueConstraintException).toBe(true);
      }
    });
    it('insert set excluded', async () => {
      await create
        .insertInto(new Table('alone'), ALONE.fields, [
          {
            id: 1,
            name: '',
            bool: true,
            date: DSL.now(),
          },
        ])
        .onConflictConstraint('alone_pkey')
        .doUpdate()
        .setExcluded()
        .execute();
      await create
        .insertInto(new Table('alone'), ALONE.fields, [
          {
            id: 1,
            name: '',
            bool: true,
            date: DSL.now(),
          },
        ])
        .onConflictConstraint('alone_pkey')
        .doNothing()
        .execute();
    });
    it('insert escaped', async () => {
      await create
        .insertInto(new Table('alone'), ALONE.fields, [
          {
            id: 1,
            name: "a'b",
            bool: true,
            date: DSL.now(),
          },
        ])
        .execute();
    });
    it('pg-format', () => {
      expect(format.literal("a'b")).toBe("'a''b'");
      expect(format.literal('ab')).toBe("'ab'");
    });
  });
});
