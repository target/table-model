import _ from 'lodash';

import { isSuperSet } from './utils';

const helperFns = {
  // Functions that return either a cell or an array of cells
  cellHelpers: {
    row: input => cellName => input.row[cellName],
    prevRow: input => cellName => {
      const { rows, rowIndex } = input;
      const prevRow = rows[rowIndex - 1];
      return prevRow ? prevRow[cellName] : null;
    },
    rowsWhere: input => (rowCriteria, cellName) => {
      const rows = _.filter(input.rows, row => isSuperSet(row.meta, rowCriteria));
      return rows.map(row => row[cellName]);
    }
  },

  // Functions that return arbitrary data (ideally values, rather than objects, arrays, etc.)
  otherHelpers: {
    meta: input => prop => input.row.meta[prop],
    preLink: input => () => input.preLink,
    set: input => (value, cells) => {
      const { trx } = input;

      if(_.isArray(cells))
        cells.forEach(cell => cell.set(value, trx));
      else
        cells.set(value, trx);
    },
    spread: input => (value, cells) => {
      const { trx } = input;

      const total = cells.reduce((total, cell) => total + cell.get(), 0);
      cells.forEach(cell => {
        const oldValue = cell.get();
        const delta = total === 0 ? (value / cells.length) : (value * (oldValue / total));
        const newValue = oldValue + delta;

        cell.set(newValue, trx);
      });
    }
  }
};

export default helperFns;
