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
    this.config = config;
  }

  get types() {
    return Types;
  }

  ///
  /// Connect to the database
  ///
  connect() {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.connection = new Connection(self.config);

      self.connection.on('connect', function(err) {
        if(err)
          reject(err);
        else
          resolve();
      });
    });
  }

  ///
  /// Run the query
  ///
  query(sql) {
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

      params.forEach((param) => request.addParameter(...param));
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