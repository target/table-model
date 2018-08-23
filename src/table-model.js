import _ from 'lodash';

import Cell from './cell';
import Transaction from './transaction';

import helperFns from './helper-functions';
import validate from './validation';

const TableModel = ({ rowDefs, helpers, listener, preLink, columnList }) => {
  // Helpers
  const allHelpers = _.merge({}, helperFns, helpers || {});

  // Listeners
  const listenerList = listener || [];
  const listeners = _.isArray(listenerList) ? listenerList : [listenerList];

  const listen = listener => listeners.push(listener);

  const fireUpdate = update => {
    listeners.forEach(listener => listener(update));
  };

  // Pre-Link
  const preLinkData = {};

  // Create rows of cells
  const cellMap = {};
  const rows = [];
  const rowsById = {};

  let cellIdCounter = 0;
  _.each(rowDefs, (rowDef, rowIndex) => {
    const { meta } = rowDef;
    const { id } = meta;
    const row = { meta };

    const cells = _.mapValues(rowDef.cells, (formula, name) => {
      const id = ++cellIdCounter;
      const cell = Cell({ id, formula, data: { meta, rows, row, rowIndex, cellName: name, preLink: preLinkData }, helperFns: allHelpers });

      cellMap[id] = cell;
      return cell;
    });

    Object.assign(row, cells);
    rows.push(row);
    rowsById[id] = row;
  });

  const willAffect = data => {
    const errors = validate(data, rowsById);
    if(errors.length) {
      const msg = `There were validation errors:\n${errors.map(error => error.msg).join('\n')}`;

      const e = new Error(msg);
      e.errors = errors;
      throw e;
    }

    const affectedCells = {};

    _.each(data, (rowUpdates, rowId) => {
      const row = rowsById[rowId];

      // Apply each update
      _.each(rowUpdates, (value, prop) => {
        const cell = row[prop];
        const dependentCells = cell.willAffect();
        Object.assign(affectedCells, dependentCells);
      });
    });

    const result = {};
    _.each(affectedCells, (value, cellId) => {
      const cell = cellMap[cellId];

      const rowId = cell.data.row.meta.id;
      const cellName = cell.data.cellName;

      const cellNames = result[rowId] || [];
      cellNames.push(cellName);
      result[rowId] = cellNames;
    });

    return result;
  };

  const mapUpdates = updates => {
    const mappedUpdates = {};
    _.each(updates, (value, cellId) => {
      const cell = cellMap[cellId];
      const { data } = cell;
      const rowId = data.meta.id;
      const cellName = data.cellName;

      const rowUpdates = mappedUpdates[rowId] || {};
      rowUpdates[cellName] = value;
      mappedUpdates[rowId] = rowUpdates;
    });

    return mappedUpdates;
  };

  // Update
  const update = data => {
    const errors = validate(data, rowsById);
    if(errors.length) {
      const msg = `There were validation errors: \n${errors.map(error => error.msg).join('\n')}`;

      const e = new Error(msg);
      e.errors = errors;
      throw e;
    }

    const trxUpdates = {};

    _.each(data, (updates, id) => {
      // Get Row by Id
      const row = rowsById[id];

      // Apply each update
      _.each(updates, (value, cellName) => {
        const cell = row[cellName];

        const trx = Transaction();
        cell.set(value, trx);

        // Records updates
        Object.assign(trxUpdates, trx.updates);
      });
    });

    const mappedUpdates = mapUpdates(trxUpdates);
    fireUpdate(mappedUpdates);
  };

  // Pre-link stage
  if(preLink) {
    const plData = preLink(rows);
    Object.assign(preLinkData, plData);
  }

  const initColumn = columnList => {
    const initTrx = Transaction({ init: true });
    if(columnList && columnList.length > 0) {
      _.each(rows, row => {
        _.each(columnList, column => {
          const cell = row[column];
          if(cell)
            cell.get(initTrx);
        });
      });
    } else {
      _.each(rows, row => {
        _.each(row, (cell, cellName) => {
          if(cellName === 'meta')
            return;

          cell.get(initTrx);
        });
      });
    }
    const { updates } = initTrx;
    const mappedUpdates = mapUpdates(updates);
    fireUpdate(mappedUpdates);
  };

  // Link and Fire Initial Update
  initColumn(columnList);

  return {
    listen,
    rows,
    update,
    willAffect,
    preLinkData,
    initColumn
  };
};

export default TableModel;
