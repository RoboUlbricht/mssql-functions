# mssql-functions
A simple wrapper for [tedious](https://github.com/tediousjs/tedious) (Node TDS module for connecting to SQL Server databases).
All functions are Promises.

## Installation
From npm.
```
npm install mssql-functions
```
Or from git.
```
npm install roboulbricht/mssql-functions
```

## class TDatabase

### Function: constructor(config)

### Property: types
Returns tedious [TYPES](https://tediousjs.github.io/tedious/api-datatypes.html).

### Function: connect()
Establishing the connection to the database.

```javascript
var Database = require('mssql-functions');

var connection_string = {
  userName: "***",
  password: "***",
  server: "***",
  options: {
    database: "***",
    instanceName: "***"
  }
}

var db = new Database(connection_string);
db.connect()
    .then(function() {
        console.log('connected');
    })
    .catch(function(error) {
        console.log(error.message);
    });
```

### Function: disconnect()
Close the connection to the database.

### Function: query(sql, params, config)
Execute the query which returns the result table.
 * `sql` {String} The SQL statement to be executed.
 * `params` {Array[]} An array of arrays containing the parameter definitions.
 * `config` {Object}
   * `columns` {true, false} Returns object with columns and rows.

```javascript
var t1 = await db.query('select * from #pokus');
console.log(t1);
var t2 = await db.query('select * from #pokus where id=@id', [
  ['id', db.types.Int, 2]
]);
console.log(t2);
var t3 = await db.query('select * from #pokus', undefined, {columns: true});
console.log(t3);
```

### Function: queryInt(sql, id)
Execute the query which returns the result table with one integer parameter. Always use @id as parameter in SQL.
 * `sql` {String} The SQL statement to be executed.
 * `id` {Int} An integer number.

```javascript
var t = await db.queryInt('select * from #pokus where id=@id', 2);
```

### Function: queryLM(sql, params, rowfunc)
Execute the query in low memory mode.
 * `sql` {String} The SQL statement to be executed.
 * `params` {Array[]} An array of arrays containing the parameter definitions.
 * `rowfunc` {Function(row)} Callback

```javascript
var t = await db.queryLM('select * from uzivatelia', undefined, (row) => {
  console.log(row);
});
```

### Function: execute(sql, params)
Execute the query without returning the result table. Good for insert queries.
 * `sql` {String} The SQL statement to be executed.
 * `params` {Array[]} An array of arrays containing the parameter definitions.

```javascript
await db.execute('insert into #pokus(id,name) values (1, \'one\')');
await db.execute('insert into #pokus(id,name) values (@id, @name)', [
  ['id', db.types.Int, 2],
  ['name', db.types.VarChar, 'two']
]);
```

### Function: executeInt(sql, id)
Execute the query without returning the result table with one integer parameter. Always use @id as parameter in SQL.
 * `sql` {String} The SQL statement to be executed.
 * `id` {Int} An integer number.

```javascript
db.executeInt('delete from #pokus where id=@id', 1);
```

### Function: executeBatch(sql)
Execute the query without returning the result table. There is no param support, but it is the only way to create temporary tables.
See the original [documentation](http://tediousjs.github.io/tedious/api-connection.html#function_execSqlBatch).
```javascript
var Database = require('mssql-functions');

var connection_string = {
  userName: "***",
  password: "***",
  server: "***",
  options: {
    database: "***",
    instanceName: "***"
  }
}

db.connect()
  .then(async function() {
    console.log('connected');
    try {
    await db.beginTransaction();
    console.log('in transaction');

    await db.executeBatch('create table #pokus(id int, name varchar(255))');
    await db.execute('insert into #pokus(id,name) values (1, \'one\')');
    await db.execute('insert into #pokus(id,name) values (2, \'two\')');
    var t = await db.query('select * from #pokus');
    console.log(t);

    await db.commitTransaction();
    console.log('commit');
    } catch(error) {
      await db.rollbackTransaction();
      console.log('error in transaction', error.message);
    }
  })
  .catch(function(err) {
    console.log('error', err.message);
  });
```

### Function: bulkLoad(table, options, columns, data)
Bulk load data.
```javascript
var Database = require('mssql-functions');

var connection_string = {
  userName: "***",
  password: "***",
  server: "***",
  options: {
    database: "***",
    instanceName: "***"
  }
}

db.connect()
  .then(async () => {
    console.log('connected');
    await db.executeInt('delete from osoby where firma_id=@id', 9999);

    var options = { keepNulls: true };
    var columns = [
      ['firma_id', db.types.Int, { nullable: true }],
      ['meno', db.types.NVarChar, { length: 50, nullable: true }],
      ['priezvisko', db.types.NVarChar, { length: 50, nullable: true }]
    ];
    var data = [
      { firma_id: 9999, meno: 'M1', priezvisko: 'P1' },
      { firma_id: 9999, meno: 'M2', priezvisko: 'P2' }
    ];
    let res = await db.bulkLoad('osoby', options, columns, data);

    db.disconnect();
  })
  .catch(function(err) {
    console.log('error', err.message);
  });
```

### Function: identity()
Return the last identity from previous function execute.

### Function: batchsql(commands)
Batch execute.

```javascript
var Database = require('mssql-functions');

var connection_string = {
  userName: "***",
  password: "***",
  server: "***",
  options: {
    database: "***",
    instanceName: "***"
  }
}

var db = new Database(connection_string);
db.connect()
    .then(function() {
      console.log('connected');
      var cmd = [
        'insert into externe_logovanie(projekt, datum, log, level) values (\'batch1\', getdate(), \'1\', 1)',
        'error sql',
        'insert into externe_logovanie(projekt, datum, log, level) values (\'batch1\', getdate(), \'3\', 1)'
      ];
      db.batchsql(cmd)
        .then(function(res) {
          console.log('batch result', res);
        })
        .catch(function(err) {
          console.log('error', err.message);
        });
    })
    .catch(function(error) {
        console.log(error.message);
    });
```

### Function: beginTransaction()
Begin the transaction.
```javascript
var Database = require('mssql-functions');

var connection_string = {
  userName: "***",
  password: "***",
  server: "***",
  options: {
    database: "***",
    instanceName: "***"
  }
}

db.connect()
  .then(async function() {
    console.log('connected');
    try {
    await db.beginTransaction();
    console.log('in transaction');

    await db.execute('insert into #pokus(id,name) values (1, \'one\')');

    await db.commitTransaction();
    console.log('commit');
    } catch(error) {
      await db.rollbackTransaction();
      console.log('error in transaction', error.message);
    }
  })
  .catch(function(err) {
    console.log('error', err.message);
  });
```

### Function: commitTransaction()
Commit the transaction.

### Function: rollbackTransaction()
Rollback the transaction.

## todo
 - Write examples