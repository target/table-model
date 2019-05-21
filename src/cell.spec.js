import _ from 'lodash';
import should from 'should';

import Cell from './cell';
import Transaction from './transaction';

import { buildHelperFactory } from './utils';

const helperFns = {
  cellHelpers: {
    row: input => {
      return cellNames => {
        const { testCells } = input;
        let result;
        if(_.isArray(cellNames))
          result = cellNames.map(cellName => testCells[cellName]);
        else
          result = testCells[cellNames];

        return result;
      };
    }
  },
  otherHelpers: {
    set: input => {
      return (value, cells) => {
        const { trx } = input;
        if(_.isArray(cells))
          cells.forEach(cell => cell.set(value, trx));
        else
          cells.set(value, trx);
      };
    },
    spread: input => {
      return (value, cells) => {
        const { trx } = input;
        const total = cells.reduce((total, cell) => total + cell.get(trx), 0);
        cells.forEach(cell => {
          const oldValue = cell.get(trx);
          const proportion = oldValue / total;
          const delta = value * proportion;
          const newValue = oldValue + delta;

          cell.set(newValue, trx);
        });
      };
    }
  }
};

const helperFactory = buildHelperFactory(helperFns);

describe('Cell', () => {
  let data;

  beforeEach(() => {
    const testCells = _.mapValues({ alpha: 10, beta: 20, delta: 100, omega: 1234 }, (value, name) => {
      return Cell({ id: name, formula: value, helperFactory });
    });
    data = { testCells };
  });

  it('should support `value` formula', () => {
    const cell = Cell({ id: 'cell', formula: 100, helperFactory, data });

    let trx = Transaction({ init: true });
    cell.get(trx).should.eql(100);

    trx = Transaction();
    cell.set(50, trx);

    cell.get().should.eql(50);
  });

  it('should support complex `value` formulas', () => {
    const cell = Cell({ id: 'cell', formula: { name: 'James', gold: 200 }, helperFactory, data });

    let trx = Transaction({ init: true });
    cell.get(trx).should.eql({ name: 'James', gold: 200 });

    trx = Transaction();
    cell.set({ name: 'Sarah', gold: 5000 }, trx);

    cell.get().should.eql({ name: 'Sarah', gold: 5000 });
  });

  it('should support `function` formula', () => {
    const cell = Cell({ id: 'cell', formula: d => d.row('alpha') + d.row(['delta', 'omega']).reduce((x, y) => x + y, 0) + 10, helperFactory, data });
    const cell2 = Cell({ id: 'cell2', formula: d => d.row('alpha') * d.row('beta'), helperFactory, data });

    let trx = Transaction({ init: true });
    cell.get(trx).should.eql(1354);
    cell2.get(trx).should.eql(200);

    should(() => {
      trx = Transaction();
      cell.set(50, trx);
    }).throw('This cell doesn\'t have a setter');

    cell.get().should.eql(1354);

    cell.dependencies.length.should.eql(3);
    cell2.dependencies.length.should.eql(2);

    const { alpha, beta, delta, omega } = data.testCells;

    alpha.dependents.length.should.eql(2);
    beta.dependents.length.should.eql(1);
    delta.dependents.length.should.eql(1);
    omega.dependents.length.should.eql(1);

    trx = Transaction();
    alpha.set(123, trx);

    trx.updates.should.deepEqual({
      alpha: 123,
      cell: 1467,
      cell2: 2460
    });
  });

  it('should only call a getter formula once per transaction', () => {
    let count = 0;

    const cell = Cell({ id: 'cell', formula: d => {
      count++;
      return d.row('alpha') + 10;
    }, helperFactory, data });

    const trx = Transaction({ init: true });
    cell.get(trx).should.eql(20);

    cell.get().should.eql(20);
    cell.get().should.eql(20);
    cell.get().should.eql(20);
    cell.get().should.eql(20);
    cell.get().should.eql(20);
    cell.get().should.eql(20);

    count.should.eql(1);
  });

  it('should only call a getter formula once per transaction when value 0', () => {
    let count = 0;
    const formula = d => {
      count++;
      return d.row('alpha') * 0;
    };
    data.testCells.gamma = Cell({ id: 'gamma', formula, helperFactory, data });
    const cell = Cell({ id: 'cell', formula: d => {
      return d.row('gamma') + 10;
    }, helperFactory, data });

    const trx = Transaction({ init: true });
    data.testCells.gamma.get(trx).should.eql(0);
    cell.get(trx).should.eql(10);

    cell.get().should.eql(10);
    cell.get().should.eql(10);
    cell.get().should.eql(10);
    cell.get().should.eql(10);
    cell.get().should.eql(10);
    cell.get().should.eql(10);
    count.should.eql(1);
  });

  it('should support `object` formula', () => {
    const cell = Cell({ id: 'cell', formula: {
      get: d => d.row('alpha') + 10,
      set: (d, value) => d.set(value - 10, d.cells.row('alpha'))
    }, helperFactory, data });

    let trx = Transaction({ init: true });
    cell.get(trx).should.eql(20);

    trx = Transaction();
    cell.set(50, trx);

    trx.updates.should.deepEqual({
      alpha: 40,
      cell: 50
    });

    cell.get().should.eql(50);
    data.testCells.alpha.get().should.eql(40);
  });

  it('should return the previous value', () => {
    const cell = Cell({ id: 'cell', formula: {
      get: (d, oldValue) => oldValue || 0,
      set: (d, value) => value
    }, helperFactory, data });

    let trx = Transaction({ init: true });
    cell.get(trx).should.eql(0);

    trx = Transaction();
    cell.set(10, trx);
    cell.get().should.eql(10);

    trx = Transaction();
    cell.set(20, trx);
    cell.get().should.eql(20);
  });
});
