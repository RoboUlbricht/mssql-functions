# mssql-functions
Wrapper for tedious.

## Installation

```
npm install roboulbricht/mssql-functions
```

## class TDatabase

### Function: connect
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
### Function: query

### Function: execute

### Function: identity

### Function: batchsql
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

### Function: beginTransaction

### Function: commitTransaction

### Function: rollbackTransaction

## todo
 - Port from existing project
 - Write examples