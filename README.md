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
        db.disconnect();
    })
    .catch(function(error) {
        console.log(error.message);
    });
```
### Function: query

### Function: execute

### Function: identity

### Function: batchsql

### Function: beginTransaction

### Function: commitTransaction

### Function: rollbackTransaction

## todo
 - Port from existing project
 - Write examples