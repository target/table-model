/* eslint-disable */
import _ from 'lodash';

const data = [
  { id: 1, color: 'red', population: 100, food: 200 },
  { id: 2, color: 'green', population: 150, food: 250 },
  { id: 3, color: 'red', population: 175, food: 225 },
  { id: 4, color: 'green', population: 215, food: 300 },
  { id: 5, color: 'red', population: 285, food: 325 },
  { id: 6, color: 'green', population: 300, food: 400 },
  { id: 7, color: 'red', population: 335, food: 600 },
  { id: 8, color: 'green', population: 400, food: 1000 },
];

const metaFields = ['id', 'color'];

const rowEquations = {
  health: {
    get: data => data.row('food') / data.row('population'),
    set: (data, health) => data.set(health * data.row('population'), data.cells.row('food'))
  },
  prevHealth: data => data.prevRow('health'),
  healthDelta: data => data.row('health') - data.row('prevHealth'),
  rolling: data => data.prevRow('rolling') + data.row('food'),
  colorSum: data => {
    const values = data.rowsWhere({ color: data.meta('color') }, 'food');
    return _.reduce(values, (total, value) => total + value);
  }
};

const rowDefs = data.map(row => {
  const cells = Object.assign({}, rowEquations, row);
  return {
    meta: _.pick(row, metaFields),
    cells: _.omit(cells, metaFields)
  };
});

const firstRow = rowDefs[0];
firstRow.cells.rolling = data => data.row('food');

rowDefs.push({
  meta: {
    id: 'TOTALS',
  },
  cells: {
    population: {
      get: data => {
        const redCells = data.rowsWhere({ color: 'red' }, 'population');
        const greenCells = data.rowsWhere({ color: 'green' }, 'population');
        return _.reduce([...redCells, ...greenCells], (total, value) => total + value)
      },
      set: (data, value, oldValue) => {
        const redCells = data.cells.rowsWhere({ color: 'red' }, 'population');
        const greenCells = data.cells.rowsWhere({ color: 'green' }, 'population');
        data.spread(value - oldValue, [...redCells, ...greenCells]);
      }
    },
    food: {
      get: data => {
        const redCells = data.rowsWhere({ color: 'red' }, 'food');
        const greenCells = data.rowsWhere({ color: 'green' }, 'food');
        return _.reduce([...redCells, ...greenCells], (total, value) => total + value)
      },
      set: (data, value, oldValue) => {
        const redCells = data.cells.rowsWhere({ color: 'red' }, 'food');
        const greenCells = data.cells.rowsWhere({ color: 'green' }, 'food');
        data.spread(value - oldValue, [...redCells, ...greenCells]);
      }
    }
  }
});

export default rowDefs;
