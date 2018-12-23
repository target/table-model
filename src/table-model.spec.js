import _ from 'lodash';
import should from 'should';
import sinon from 'sinon';
import TableModel from './table-model';

const props = {};

describe('TableModel', () => {
  beforeEach(() => {
    const rowDefs = efficentRowDefs();

    props.spy = sinon.spy();
    props.tableModel = TableModel({ rowDefs, listener: props.spy });
  });

  it('should emit a complete initial update', () => {
    const { spy, tableModel } = props;

    tableModel.should.not.be.null();

    spy.callCount.should.equal(1);
    spy.getCall(0).args[0].should.deepEqual({
      1: { units: 100, asp: 2, sales: 200, doubleAsp: 4, prevDoubleAsp: null, rolling: 200, colorSum: 1334 },
      2: { units: 150, asp: 1.6666666666666667, sales: 250, doubleAsp: 3.3333333333333335, prevDoubleAsp: 4, rolling: 323, colorSum: 150 },
      3: { units: 1234, asp: 4.60129659643436, sales: 5678, doubleAsp: 9.20259319286872, prevDoubleAsp: 3.3333333333333335, rolling: 446, colorSum: 1334 }
    });

    tableModel.rows[0].units.get().should.equal(100);
    tableModel.rows[0].asp.get().should.equal(2);
    tableModel.rows[0].sales.get().should.equal(200);
    tableModel.rows[1].asp.get().should.be.approximately(1.6, 0.1);
  });

  it('should be able to process updates that trigger all listeners', () => {
    const { spy, tableModel } = props;

    // Test A
    tableModel.update({ 1: { sales: 105 } });

    spy.callCount.should.equal(2);
    spy.getCall(1).args[0].should.deepEqual({
      1: { asp: 1.05, sales: 105, doubleAsp: 2.1, rolling: 105 },
      2: { prevDoubleAsp: 2.1, rolling: 228 },
      3: { rolling: 351 }
    });

    // Test B
    tableModel.update({ 1: { units: 123 } });

    spy.callCount.should.equal(3);
    spy.getCall(2).args[0].should.deepEqual({
      1: { asp: 0.8536585365853658, doubleAsp: 1.7073170731707317, units: 123, colorSum: 1357 },
      2: { prevDoubleAsp: 1.7073170731707317 },
      3: { colorSum: 1357 }
    });
  });

  it('should be able to process updates on cells with setters', () => {
    const { spy, tableModel } = props;

    tableModel.update({ 2: { asp: 10 } });

    spy.getCall(1).args[0].should.deepEqual({
      2: { asp: 10, sales: 1500, doubleAsp: 20 },
      3: { prevDoubleAsp: 20 }
    });
  });

  it('should be able to predict affect cells of an update', () => {
    const { tableModel } = props;

    let affectedCells = tableModel.willAffect({ 2: { asp: 10 } });
    affectedCells.should.deepEqual({
      2: ['asp', 'doubleAsp', 'sales'],
      3: ['prevDoubleAsp']
    });

    affectedCells = tableModel.willAffect({ 1: { doubleAsp: 50 } });
    affectedCells.should.deepEqual({
      1: ['asp', 'doubleAsp', 'rolling', 'sales'],
      2: ['prevDoubleAsp', 'rolling'],
      3: ['rolling']
    });
  });

  it('should throw an error when trying to update a cell that doesn\'t exist', () => {
    const { tableModel } = props;

    let error = null;
    should(() => {
      try {
        tableModel.update({ 1: { notHere: 123 } });
      } catch(e) {
        error = e;
        throw e;
      }
    }).throw();

    error.errors.should.deepEqual([{
      msg: 'Cell "notHere" @ row 1 does not exist',
      row: '1',
      cell: 'notHere'
    }]);
  });

  it('should throw an error when trying to update conflicting cells', () => {
    const { tableModel } = props;

    let error = null;
    should(() => {
      try {
        tableModel.update({ 2: { asp: 15, sales: 500 } });
      } catch(e) {
        error = e;
        throw e;
      }
    }).throw();

    error.errors.should.deepEqual([{
      msg: 'Can\'t update "sales" @ row 2 and "asp" @ row 2 at the same time',
      rowA: '2', cellA: 'sales',
      rowB: '2', cellB: 'asp'
    }]);
  });

  it('should throw an error when trying to update read-only cells', () => {
    const { tableModel } = props;

    let error = null;
    should(() => {
      try {
        tableModel.update({ 3: { prevDoubleAsp: 100 } });
      } catch(e) {
        error = e;
        throw e;
      }
    }).throw();

    error.errors.should.deepEqual([{
      msg: 'Can\'t update "prevDoubleAsp" @ row 3',
      row: '3', cell: 'prevDoubleAsp'
    }]);
  });

  it('should work with spreading', () => {
    const rowDefs = [
      {
        meta: { id: 'test' },
        cells: {
          total: {
            get: d => d.row('a') + d.row('b') + d.row('c') + d.row('d'),
            set: (d, value, oldValue) => d.spread(value - oldValue, [
              d.cells.row('a'), d.cells.row('b'), d.cells.row('c'), d.cells.row('d')
            ])
          },
          a: 100, b: 200, c: 300, d: 400,
          otherTotal: d => d.row('b') + d.row('c') + d.row('d') }
      }
    ];

    const listener = sinon.spy();

    // Initial update
    const table = TableModel({ rowDefs, listener });

    listener.callCount.should.eql(1);
    listener.getCall(0).args[0].should.deepEqual({
      test: {
        a: 100, b: 200, c: 300, d: 400,
        total: 1000, otherTotal: 900
      }
    });

    // Update
    table.update({ test: { total: 2000 } });

    listener.callCount.should.eql(2);
    listener.getCall(1).args[0].should.deepEqual({
      test: {
        a: 200, b: 400, c: 600, d: 800,
        total: 2000, otherTotal: 1800
      }
    });
  });

  it('should work with spreading where total is initially zero', () => {
    const rowDefs = [
      {
        meta: { id: 'test' },
        cells: {
          total: {
            get: d => d.row('a') + d.row('b') + d.row('c') + d.row('d'),
            set: (d, value, oldValue) => d.spread(value - oldValue, [
              d.cells.row('a'), d.cells.row('b'), d.cells.row('c'), d.cells.row('d')
            ])
          },
          a: 0, b: 0, c: 0, d: 0,
          otherTotal: d => d.row('b') + d.row('c') + d.row('d') }
      }
    ];

    const listener = sinon.spy();

    // Initial update
    const table = TableModel({ rowDefs, listener });

    listener.callCount.should.eql(1);
    listener.getCall(0).args[0].should.deepEqual({
      test: {
        a: 0, b: 0, c: 0, d: 0,
        total: 0, otherTotal: 0
      }
    });

    // Update
    table.update({ test: { total: 2000 } });

    listener.callCount.should.eql(2);
    listener.getCall(1).args[0].should.deepEqual({
      test: {
        a: 500, b: 500, c: 500, d: 500,
        total: 2000, otherTotal: 1500
      }
    });
  });

  describe('spreading', () => {
    it('should be able to support spreading', () => {
      // Set2: (data, mtd, oldMtd) => data.set(data.rowsWhere({x: 100}, 'sales')).spread(mtd - oldMtd)
      const mtdUnitsFormula = {
        get: data => {
          const cells = data.rowsWhere({ month: data.meta('mtd') }, 'units');
          return cells.reduce((total, cell) => total + cell, 0);
        },
        set: (data, mtd, oldMtd) => {
          const cellsForMonth = data.cells.rowsWhere({ month: data.meta('mtd') }, 'units');
          data.spread(mtd - oldMtd, cellsForMonth);
        }
      };

      const rowDefs = [
        // Month A
        { meta: { id: 1, month: 1 }, cells: { units: 10 } },
        { meta: { id: 2, month: 1 }, cells: { units: 20 } },
        { meta: { id: 3, month: 1 }, cells: { units: 30 } },
        { meta: { id: 4, month: 1 }, cells: { units: 40 } },
        {
          meta: { id: 5, mtd: 1 },
          cells: { units: mtdUnitsFormula }
        },

        // Month B
        { meta: { id: 6, month: 2 }, cells: { units: 100 } },
        { meta: { id: 7, month: 2 }, cells: { units: 200 } },
        { meta: { id: 8, month: 2 }, cells: { units: 300 } },
        { meta: { id: 9, month: 2 }, cells: { units: 400 } },
        { meta: { id: 10, month: 2 }, cells: { units: 500 } },
        {
          meta: { id: 11, mtd: 2 },
          cells: { units: mtdUnitsFormula }
        },

        // Month C
        { meta: { id: 12, month: 3 }, cells: { units: 1234 } },
        { meta: { id: 13, month: 3 }, cells: { units: 5678 } }
      ];

      const spy = sinon.spy();
      const tableModel = TableModel({ rowDefs, listener: spy });

      spy.callCount.should.equal(1);
      let update = spy.getCall(0).args[0];
      let units = _.map(update, x => x.units);
      units.slice(0, 5).should.deepEqual([10, 20, 30, 40, 100]);
      units.slice(5, 11).should.deepEqual([100, 200, 300, 400, 500, 1500]);
      units.slice(11, 13).should.deepEqual([1234, 5678]);

      tableModel.update({ 11: { units: 2250 } });

      spy.callCount.should.equal(2);
      update = spy.getCall(1).args[0];
      units = _.map(update, x => x.units);
      units.should.deepEqual([150, 300, 450, 600, 750, 2250]);
    });
  });
});

describe('TableModel add calculated column', () => {
  beforeEach(() => {
    const rowDefs = efficentRowDefs();

    props.spy = sinon.spy();
    props.tableModel = TableModel({ rowDefs, listener: props.spy, columnList: ['units', 'sales', 'asp'] });
  });

  it('should columns in list and should be able to add new column', () => {
    const { spy, tableModel } = props;
    tableModel.should.not.be.null();

    spy.callCount.should.equal(1);
    spy.getCall(0).args[0].should.deepEqual({
      1: { units: 100, asp: 2, sales: 200 },
      2: { units: 150, asp: 1.6666666666666667, sales: 250 },
      3: { units: 1234, asp: 4.60129659643436, sales: 5678 }
    });

    tableModel.addColumns(['doubleAsp']);
    spy.callCount.should.equal(2);
    spy.getCall(1).args[0].should.deepEqual({
      1: { units: 100, asp: 2, sales: 200, doubleAsp: 4 },
      2: { units: 150, asp: 1.6666666666666667, sales: 250, doubleAsp: 3.3333333333333335 },
      3: { units: 1234, asp: 4.60129659643436, sales: 5678, doubleAsp: 9.20259319286872 }
    });

    tableModel.rows[0].units.get().should.equal(100);
    tableModel.rows[0].asp.get().should.equal(2);
    tableModel.rows[0].sales.get().should.equal(200);
    tableModel.rows[1].asp.get().should.be.approximately(1.6, 0.1);
  });

  it('should not reset already added columns', () => {
    const { spy, tableModel } = props;
    tableModel.should.not.be.null();

    spy.callCount.should.equal(1);
    spy.getCall(0).args[0].should.deepEqual({
      1: { units: 100, asp: 2, sales: 200 },
      2: { units: 150, asp: 1.6666666666666667, sales: 250 },
      3: { units: 1234, asp: 4.60129659643436, sales: 5678 }
    });

    tableModel.update({ 1: { units: 200 } });
    tableModel.addColumns( ['doubleAsp', 'units'] );
    spy.callCount.should.equal(3);

    spy.getCall(2).args[0].should.deepEqual({
      1: { units: 200, asp: 1, sales: 200, doubleAsp: 2 },
      2: { units: 150, asp: 1.6666666666666667, sales: 250, doubleAsp: 3.3333333333333335 },
      3: { units: 1234, asp: 4.60129659643436, sales: 5678, doubleAsp: 9.20259319286872 }
    });

    tableModel.rows[0].units.get().should.equal(200);
    tableModel.rows[0].asp.get().should.equal(1);
    tableModel.rows[0].doubleAsp.get().should.equal(2);
    tableModel.rows[0].sales.get().should.equal(200);
    tableModel.rows[1].asp.get().should.be.approximately(1.6, 0.1);
  });
});

function efficentRowDefs() {
  const cellsTemplate = {
    asp: {
      get: data => data.row('sales') / data.row('units'),
      set: (data, asp) => data.set(asp * data.row('units'), data.cells.row('sales'))
    },
    doubleAsp: {
      get: data => data.row('asp') * 2,
      set: (data, doubleAsp) => data.set(doubleAsp / 2, data.cells.row('asp'))
    },
    prevDoubleAsp: data => data.prevRow('doubleAsp'),
    rolling: data => data.prevRow('rolling') + 123,
    colorSum: data => {
      const values = data.rowsWhere({ style: data.meta('style') }, 'units');
      return _.reduce(values, (total, value) => total + value);
    }
  };

  const data = [
    { id: 1, style: 'red', units: 100, sales: 200 },
    { id: 2, style: 'green', units: 150, sales: 250 },
    { id: 3, style: 'red', units: 1234, sales: 5678 }
  ];

  const metaFields = ['id', 'style'];
  const rowDefs = data.map(row => {
    const cells = Object.assign({}, cellsTemplate, row);
    return {
      meta: _.pick(row, metaFields),
      cells: _.omit(cells, metaFields)
    };
  });

  const firstRow = rowDefs[0];
  firstRow.cells.rolling = data => data.row('sales');

  return rowDefs;
}

function manualRowDefs() { // eslint-disable-line no-unused-vars
  return [
    {
      meta: { id: 1, style: 'red' },
      cells: {
        units: 100,
        asp: {
          get: data => data.row('sales') / data.row('units'),
          set: (data, asp) => data.set(asp * data.row('units'), data.cells.row('sales'))
        },
        sales: 200,
        doubleAsp: {
          get: data => data.row('asp') * 2,
          set: (data, doubleAsp) => data.set(doubleAsp / 2, data.cells.row('asp'))
        },
        prevDoubleAsp: data => data.prevRow('doubleAsp'),
        rolling: data => data.row('sales'),
        colorSum: data => {
          const values = data.rowsWhere({ style: data.meta('style') }, 'units');
          return _.reduce(values, (total, value) => total + value);
        }
      }
    },
    {
      meta: { id: 2, style: 'green' },
      cells: {
        units: 150,
        asp: {
          get: data => data.row('sales') / data.row('units'),
          set: (data, asp) => data.set(asp * data.row('units'), data.cells.row('sales'))
        },
        sales: 250,
        doubleAsp: {
          get: data => data.row('asp') * 2,
          set: (data, doubleAsp) => data.set(doubleAsp / 2, data.cells.row('asp'))
        },
        prevDoubleAsp: data => data.prevRow('doubleAsp'),
        rolling: data => data.prevRow('rolling') + 123,
        colorSum: data => {
          const values = data.rowsWhere({ style: data.meta('style') }, 'units');
          return _.reduce(values, (total, value) => total + value);
        }
      }
    },
    {
      meta: { id: 3, style: 'red' },
      cells: {
        units: 1234,
        asp: {
          get: data => data.row('sales') / data.row('units'),
          set: (data, asp) => data.set(asp * data.row('units'), data.cells.row('sales'))
        },
        sales: 5678,
        doubleAsp: {
          get: data => data.row('asp') * 2,
          set: (data, doubleAsp) => data.set(doubleAsp / 2, data.cells.row('asp'))
        },
        prevDoubleAsp: data => data.prevRow('doubleAsp'),
        rolling: data => data.prevRow('rolling') + 123,
        colorSum: data => {
          const values = data.rowsWhere({ style: data.meta('style') }, 'units');
          return _.reduce(values, (total, value) => total + value);
        }
      }
    }
  ];
}
