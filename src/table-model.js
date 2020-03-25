import _ from 'lodash';

import Cell from './cell';
import Transaction from './transaction';

import helperFns from './helper-functions';
import validate from './validation';

import { buildHelperFactory } from './utils';

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

  const addColumns = columnList => {
    _.each(rowDefs, (rowDef, rowIndex) => {
      const columns = columnList || Object.keys(rowDef.cells);
      const { meta } = rowDef;
      const { id } = meta;
      let row = rows.find(row => row.meta.id === id);
      if(!row) {
        row = { meta };
        rows.push(row);
      }
      const helperFactory = buildHelperFactory(allHelpers, { meta, rows, row, rowIndex, preLink: preLinkData });
      columns.forEach(col => {
        if(row[col])
          return;
        const formula = rowDef.cells[col];
        const id = ++cellIdCounter;
        const cell = Cell({ id, formula, data: { meta, row, cellName: col }, helperFactory });
        cellMap[id] = cell;
        row[col] = cell;
      });
      rowsById[id] = row;
    });

    // Pre-link stage
    if(preLink) {
      const plData = preLink(rows);
      Object.assign(preLinkData, plData);
    }

    // Link and Fire Initial Update
    const initTrx = Transaction({ init: true });
    _.each(rows, row => {
      const columns = columnList || Object.keys(row);
      _.each(columns, column => {
        const cell = row[column];
        if(column === 'meta')
          return;
        if(cell)
          cell.get(initTrx);
      });
    });
    const { updates } = initTrx;
    const mappedUpdates = mapUpdates(updates);
    fireUpdate(mappedUpdates);
  };

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

  addColumns(columnList);

  return {
    listen,
    rows,
    update,
    willAffect,
    preLinkData,
    addColumns
  };
};

export default TableModel;
