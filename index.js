"use strict";

var Connection = require('tedious').Connection;
var Types = require('tedious').TYPES;
var Request = require('tedious').Request;

/* Example of config - See the Tedious documentation
{
  "userName": "***",
  "password": "***",
  "server": "***",
  "options": {
    "database": "***",
    "instanceName": "***"
  }
}
*/

module.exports = class TDatabase {

  constructor(config) {
    // check old config
    if(config.authentication == undefined && config.userName && config.password) {
      config.authentication = {
        type: "default",
        options: {
          userName: config.userName,
          password: config.password
        }
      };
      delete config.userName;
      delete config.password;
    }
    this.config = config;
  }

  get types() {
    return Types;
  }

  ///
  /// Connect to the database
  ///
  connect() {
    return new Promise((resolve, reject) => {
      this.connection = new Connection(this.config);

      this.connection.on('connect', (err) => {
        if(err)
          reject(err);
        else
          resolve();
      });
    });
  }

  ///
  /// Disconnect the database
  ///
  disconnect() {
    if(this.connection) {
      this.connection.close();
      this.connection = undefined;
    }
  }

  ///
  /// Run the query
  ///
  query(sql, params, config) {
    var self = this;
    var rows = [];
    var cols = [];
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
        else {
          if(config && config.columns==true) {
            resolve({
              columns: cols,
              rows: rows
            });
            return;
          }
          resolve(rows);
        }
      });

      request.on('columnMetadata', function (columns) {
        cols = [];
        columns.forEach(function(column) {
          let col = {
            colName: column.colName,
            dataLength: column.dataLength,
            type: column.type.id,
            typeName: column.type.name
          }
          cols.push(col);
        });
      });

      request.on('row', function(columns) {
        let row = {}
        columns.forEach(function(column) {
          row[column.metadata.colName] = column.value
        });
        rows.push(row);
      });

      if(params)
        params.forEach((param) => request.addParameter(...param));
      self.connection.execSql(request);
    });
  }

  ///
  /// Run the query with one integer parameter
  ///
  /// Use it in the form queryInt('select * from tbl where id_primary=@id', 1)
  ///
  queryInt(sql, id) {
    var self = this;
    var rows = [];
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
        else {
          resolve(rows);
        }
      });

      request.on('row', function(columns) {
        var row = {}
        columns.forEach(function(column) {
          row[column.metadata.colName] = column.value
        });
        rows.push(row);
      });

      request.addParameter('id', Types.Int, id);
      self.connection.execSql(request);
    });
  }

  ///
  /// Run the query with low memory
  ///
  queryLM(sql, params, rowfunc) {
    var self = this;
    return new Promise((resolve, reject) => {
      if(typeof(rowfunc) !== 'function')
        reject(new Error('Parameter rowfunc must be a function.'));
      var request = new Request(sql, (err, rowCount) => {
        if(err)
          reject(err);
        else {
          resolve(rowCount);
        }
      });

      request.on('row', (columns) => {
        let row = {}
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value
        });
        rowfunc(row);
      });

      if(params)
        params.forEach((param) => request.addParameter(...param));
      self.connection.execSql(request);
    });
  }

  ///
  /// Run the execute
  ///
  execute(sql, params) {
    var self = this;
    var count = 0;
    params = params || [];
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
        else
          count = rowCount;
      });

      request.on('requestCompleted', function() {
        resolve(count);
      })

      if(params)
        params.forEach((param) => request.addParameter(...param));
      self.connection.execSql(request);
    });
  }

  ///
  /// Run the execute with one integer parameter
  ///
  /// Use it in the form executeInt('delete from tbl where id_primary=@id', 1)
  ///
  executeInt(sql, id) {
    var self = this;
    var count = 0;
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
        else
          count = rowCount;
      });

      request.on('requestCompleted', function() {
        resolve(count);
      })

      request.addParameter('id', Types.Int, id);
      self.connection.execSql(request);
    });
  }

  ///
  /// Run the execute for special cases
  /// There is no param support, but it is the only way to create temporary tables.
  ///
  executeBatch(sql) {
    var self = this;
    var count = 0;
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
        else
          count = rowCount;
      });

      request.on('requestCompleted', function() {
        resolve(count);
      })

      self.connection.execSqlBatch(request);
    });
  }

  ///
  /// Bulk Load
  ///
  bulkLoad(table, options, columns, data) {
    return new Promise((resolve, reject) => {
      var bulkLoad = this.connection.newBulkLoad(table, options, (error, rowCount) => {
        if(error)
          reject(error);
        else
          resolve(rowCount);
      });

      columns.forEach((col) => bulkLoad.addColumn(...col));
      data.forEach((row) => bulkLoad.addRow(row));
      this.connection.execBulkLoad(bulkLoad);
    });
  }

  ///
  /// Get last identity
  ///
  identity() {
    var sql = 'select @@identity';
    var self = this;
    var id = 0;
    return new Promise(function(resolve, reject) {
      var request = new Request(sql, function(err, rowCount) {
        if(err)
          reject(err);
      });

      request.on('row', function(columns) {
        id = columns[0].value;
      })

      request.on('requestCompleted', function() {
        resolve(id);
      })

      self.connection.execSql(request);
    });
  }

  ///
  /// Run batch
  ///
  batchsql(commands) {
    var res = [];
    var self = this;
    return new Promise(function(resolve, reject) {

      async function innerBatch() {
      for(var i = 0; i<commands.length; i++) {
        var command = {
          sql: commands[i]
        };

        await self.execute(command.sql)
          .then(function(res) {
            command.count = res;
          })
          .catch(function(err) {
            command.error = err.message;
          });

        res.push(command);
        }

      resolve(res);
      }

      innerBatch();

    });

  }

  ///
  /// Start of a transaction
  ///
  beginTransaction() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.connection.beginTransaction(function(err) {
        if(err)
          reject(err);
        else
          resolve();
      });
    });
  }

  ///
  /// Commit of a transaction
  ///
  commitTransaction() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.connection.commitTransaction(function(err) {
        if(err)
          reject(err);
        else
          resolve();
      });
    });
  }

  ///
  /// Rollback of a transaction
  ///
  rollbackTransaction() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.connection.rollbackTransaction(function(err) {
        if(err)
          reject(err);
        else
          resolve();
      });
    });
  }

};