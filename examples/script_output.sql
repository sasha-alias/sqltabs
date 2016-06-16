DROP SCHEMA IF EXISTS test CASCADE;

DO $$
BEGIN RAISE NOTICE 'AAA'; END;
$$;

CREATE SCHEMA test;

CREATE TABLE test.mytable(t text);

INSERT INTO test.mytable (t) VALUES ('Example');

SELECT * FROM test.mytable;

DO $$ exception example $$