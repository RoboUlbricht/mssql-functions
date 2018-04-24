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
### Function: query(sql)
Execute the query which returns the result table.

### Function: execute(sql, params)
Execute the query without returning the result table. Good for insert queries.

### Function: identity()
Return the last identity from previous execute.

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

### Function: commitTransaction()
Commit the transaction.

### Function: rollbackTransaction()
Rollback the transaction.

## todo
 - Write examples