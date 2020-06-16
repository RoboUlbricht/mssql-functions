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

  constructor(config, params) {
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
    if(this.config.options==undefined)
      this.config.options = {};
    if(this.config.options.trustServerCertificate==undefined)
      this.config.options.trustServerCertificate = true;
    this.params = params;
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
      this.connection.connect();

      this.connection.on('connect', (err) => {
        if(err) {
          if(this.params && this.params.logger)
            this.params.logger.error(err.message);
          reject(err);
        }
        else {
          if(this.params && this.params.logger)
            this.params.logger.info('TDatabase.Connected');
          resolve();
        }
      });

      this.connection.on('end', () => {
        if(this.params && this.params.logger)
          this.params.logger.info('TDatabase.Disconnected');
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
    var rows = [];
    var cols = [];
    if(this.params && this.params.logger) {
      this.params.logger.debug('TDatabase.query: ' + sql);
      params.forEach((param) => this.params.logger.debug(` - ${param[0]}: ${param[2]}`));
    }
    return new Promise((resolve, reject) => {
      let hrstart = process.hrtime();
      var request = new Request(sql, (err, rowCount) => {
        if(err) {
          if(this.params && this.params.logger)
            this.params.logger.error(err.message);
          reject(err);
        }
        else {
          let hrend = process.hrtime(hrstart);
          if(this.params && this.params.logger)
            this.params.logger.debug(`Count: ${rowCount}, (${hrend[0]}s ${hrend[1] / 1000000 | 0}ms)`);

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

      request.on('columnMetadata', (columns) => {
        cols = [];
        columns.forEach((column) => {
          let col = {
            colName: column.colName,
            dataLength: column.dataLength,
            type: column.type.id,
            typeName: column.type.name
          }
          cols.push(col);
        });
      });

      request.on('row', (columns) => {
        let row = {}
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value
        });
        rows.push(row);
      });

      if(params)
        params.forEach((param) => request.addParameter(...param));
      this.connection.execSql(request);
    });
  }

  ///
  /// Run the query with one integer parameter
  ///
  /// Use it in the form queryInt('select * from tbl where id_primary=@id', 1)
  ///
  queryInt(sql, id) {
    if(this.params && this.params.logger) {
      this.params.logger.debug('TDatabase.queryInt: ' + sql);
      this.params.logger.debug(` - id: ${id}`);
    }
    var rows = [];
    return new Promise((resolve, reject) => {
      let hrstart = process.hrtime();
      var request = new Request(sql, (err, rowCount) => {
        if(err) {
          if(this.params && this.params.logger)
            this.params.logger.error(err.message);
          reject(err);
        }
        else {
          let hrend = process.hrtime(hrstart);
          if(this.params && this.params.logger)
            this.params.logger.debug(`Count: ${rowCount}, (${hrend[0]}s ${hrend[1] / 1000000 | 0}ms)`);
          resolve(rows);
        }
      });

      request.on('row', (columns) => {
        var row = {}
        columns.forEach((column) => {
          row[column.metadata.colName] = column.value
        });
        rows.push(row);
      });

      request.addParameter('id', Types.Int, id);
      this.connection.execSql(request);
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
    var count = 0;
    params = params || [];
    if(this.params && this.params.logger) {
      this.params.logger.debug('TDatabase.execute: ' + sql);
      params.forEach((param) => this.params.logger.debug(` - ${param[0]}: ${param[2]}`));
    }
    return new Promise((resolve, reject) => {
      let hrstart = process.hrtime();
      var request = new Request(sql, (err, rowCount) => {
        if(err)
          reject(err);
        else
          count = rowCount;
      });

      request.on('requestCompleted', () => {
        let hrend = process.hrtime(hrstart);
        if(this.params && this.params.logger)
          this.params.logger.debug(`Count: ${count}, (${hrend[0]}s ${hrend[1] / 1000000 | 0}ms)`);
        resolve(count);
      })

      if(params)
        params.forEach((param) => request.addParameter(...param));
      this.connection.execSql(request);
    });
  }

  ///
  /// Run the execute with one integer parameter
  ///
  /// Use it in the form executeInt('delete from tbl where id_primary=@id', 1)
  ///
  executeInt(sql, id) {
    if(this.params && this.params.logger) {
      this.params.logger.debug('TDatabase.executeInt: ' + sql);
      this.params.logger.debug(` - id: ${id}`);
    }
    var count = 0;
    return new Promise((resolve, reject) => {
      let hrstart = process.hrtime();
      var request = new Request(sql, (err, rowCount) => {
        if(err)
          reject(err);
        else
          count = rowCount;
      });

      request.on('requestCompleted', () => {
        let hrend = process.hrtime(hrstart);
        if(this.params && this.params.logger)
          this.params.logger.debug(`Count: ${count}, (${hrend[0]}s ${hrend[1] / 1000000 | 0}ms)`);
        resolve(count);
      })

      request.addParameter('id', Types.Int, id);
      this.connection.execSql(request);
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
    return new Promise((resolve, reject) => {
      this.connection.beginTransaction((err) => {
        if(err)
          reject(err);
        else {
          if(this.params && this.params.logger)
            this.params.logger.info('TDatabase.beginTransaction');
          resolve();
        }
      });
    });
  }

  ///
  /// Commit of a transaction
  ///
  commitTransaction() {
    return new Promise((resolve, reject) => {
      this.connection.beginTransaction((err) => {
        if(err)
          reject(err);
          else {
            if(this.params && this.params.logger)
              this.params.logger.info('TDatabase.commitTransaction');
            resolve();
          }
        });
    });
  }

  ///
  /// Rollback of a transaction
  ///
  rollbackTransaction() {
    return new Promise((resolve, reject) => {
      this.connection.beginTransaction((err) => {
        if(err)
          reject(err);
          else {
            if(this.params && this.params.logger)
              this.params.logger.info('TDatabase.rollbackTransaction');
            resolve();
          }
        });
    });
  }

};