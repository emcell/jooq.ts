# tsooq

This project aims to provide a replacement for [jOOQ](https://www.jooq.org/) from the java world.

I've always loved to use jOOQ in my java or kotlin projects. This has always
been the missing part of the typescript eco system for me.

This library is experimental and in early stages. Don't use this in prodcution.

# How do develop

Start the typescript compiler in watch mode

```bash
yarn watch
```

Run tests

```bash
docker-compose up -d
yarn test
```

## Correct conversion of float values

Javascript number has some limitations since it's using IEEE 754 standard to encode all numbers

In some use cases you need a different type than number to store floating point values.
pg offers a method to manipulate how database types are mapped to an result object

The default behaviour is to convert all floating point values to string.

so if you query something like `select avg(salary) from persons` you'll get a string as a result.
usually that is not the expected behaviour

just use this snippet before connecting to the databse to convert all floating point values to number

```ts
import pg from 'pg';

pg.types.setTypeParser(pg.types.builtins.FLOAT4, parseFloat);
pg.types.setTypeParser(pg.types.builtins.FLOAT8, parseFloat);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, parseFloat);
```
