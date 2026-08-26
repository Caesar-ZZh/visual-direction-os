const assert = require('node:assert/strict');
const { createSchemaMigrator } = require('./schema-migrations.js');

const migrator = createSchemaMigrator({
  currentVersion:3,
  migrations:{
    1:(model) => ({ ...model, schemaVersion:2, migrated:[...(model.migrated || []), '1→2'] }),
    2:(model) => ({ ...model, schemaVersion:3, migrated:[...(model.migrated || []), '2→3'] })
  }
});

const source = { schemaVersion:1, payload:{ x:1 } };
const migrated = migrator.migrate(source);
assert.equal(migrated.model.schemaVersion, 3);
assert.deepEqual(migrated.model.migrated, ['1→2', '2→3']);
assert.deepEqual(migrated.steps, ['1→2', '2→3']);
assert.equal(source.schemaVersion, 1, 'migration must not mutate source schemaVersion');
assert.equal(source.migrated, undefined, 'migration must not mutate source object');

const current = migrator.migrate({ schemaVersion:3, payload:{ current:true } });
assert.equal(current.model.schemaVersion, 3);
assert.deepEqual(current.steps, []);

assert.doesNotThrow(() => migrator.assertSupported(1));
assert.doesNotThrow(() => migrator.assertSupported(3));
assert.throws(() => migrator.assertSupported(4), /newer|update/i);
assert.throws(() => migrator.migrate({ schemaVersion:0 }), /positive|schema/i);

const broken = createSchemaMigrator({ currentVersion:2, migrations:{} });
assert.throws(() => broken.migrate({ schemaVersion:1 }), /migration|1.*2/i);

console.log('schema migration tests passed');
