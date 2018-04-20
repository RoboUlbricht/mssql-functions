"use strict";

var Connection = require('tedious').Connection;
var Types = require('tedious').TYPES;
var Request = require('tedious').Request;
var fs = require('fs');

/* Vzorovy obsah suboru vyvojarskej databazy
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

module.exports = class TDatabaza {

  constructor(config) {
    if(config)
      this.config = config;
    else {
    var path = __dirname + '/config/db.json';
    var content = fs.readFileSync(path);
    this.config = JSON.parse(content);
    }
  }

  get types() {
        return Types;
    }

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