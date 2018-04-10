import sinon from 'sinon';

import TableModel from './index';

describe('example', () => {
  it('should work', () => {
    // Formulas
    const totalEquation = d => d.row('a') + d.row('b') + d.row('c');
    const extraEquation = d => d.row('b') * d.row('c');

    // This builds a formula that matches a given color
    const colorTotals = color => {
      return d => {
        // Get the 'total's from all rows with the matching color
        const numbers = d.rowsWhere({ type: color }, 'total');
        // Sum up the numbers to get to total
        return numbers.reduce((total, num) => total + num, 0);
      };
    };

    // This array contains a list of our rows and their cells
    const rowDefs = [
      // Row 1
      {
        meta: { id: 1, type: 'red' },
        cells: { a: 10, b: 20, c: 30, total: totalEquation }

      },
      // Row 2
      {
        meta: { id: 2, type: 'green' },
        // Rows don't have to have the same types of cells
        cells: { a: 12, b: 45, c: 38, d: 1234, total: totalEquation, extra: extraEquation }

      },
      // Row 3
      {
        meta: { id: 3, type: 'red' },
        cells: { a: 100, b: 200, c: 300, total: totalEquation }

      },
      // Totals
      {
        meta: { id: 4 },
        cells: { redTotal: colorTotals('red'), greenTotal: colorTotals('green') }
      }
    ];

    const listener = sinon.spy();

    const table = TableModel({ rowDefs, listener });

    listener.callCount.should.eql(1);
    listener.getCall(0).args[0].should.deepEqual({
      1: { a: 10, b: 20, c: 30, total: 60 },
      2: { a: 12, b: 45, c: 38, d: 1234, total: 95, extra: 1710 },
      3: { a: 100, b: 200, c: 300, total: 600 },
      4: { redTotal: 660, greenTotal: 95 }
    });

    table.update({ 2: { c: 123 } });

    listener.callCount.should.eql(2);
    listener.getCall(1).args[0].should.deepEqual({
      2: { c: 123, total: 180, extra: 5535 },
      4: { greenTotal: 180 }
    });
  });
});
