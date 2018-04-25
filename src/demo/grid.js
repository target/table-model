/* eslint-disable */
import 'ag-grid/dist/styles/ag-grid.css';
import 'ag-grid/dist/styles/ag-theme-balham.css';

import { AgGridReact } from 'ag-grid-react';
import _ from 'lodash';
import React, { Component } from 'react';

import { updateTable, buildHighlighter } from '../ag-grid-utils';
import TableModel from '../index';
import rowDefs from './row-defs';

const rowDefsById = {};
_.each(rowDefs, row => rowDefsById[row.meta.id] = row);

console.log('RowDefs:', rowDefs);
console.log('RowDefsById:', rowDefsById);

const twoDigits = ({ value }) => {
  if(!value)
    return null;

  return value.toFixed(2);
};

class Grid extends Component {
  constructor(props) {
    super(props);

    this.onAGGridUpdate = params => {
      updateTable(this.state.tableModel, params);
    };

    this.state = {
      agGrid: {
        columnDefs: [
          { headerName: 'Week', field: 'meta.id', width: 75 },
          { headerName: 'Color', field: 'meta.color', width: 75 },
          { headerName: 'Population', field: 'population', width: 120, editable: true, cellClass: 'editable', valueFormatter: twoDigits },
          { headerName: 'Food', field: 'food', width: 80, editable: true, cellClass: 'editable', valueFormatter: twoDigits },
          { headerName: 'Health', field: 'health', width: 80, valueFormatter: twoDigits },
          { headerName: 'Prev. Health', field: 'prevHealth', width: 115, valueFormatter: twoDigits },
          { headerName: 'Health Delta', field: 'healthDelta', width: 115, valueFormatter: twoDigits },
          { headerName: 'Rolling Food', field: 'rolling', width: 115, valueFormatter: twoDigits },
          { headerName: 'Food By Color', field: 'colorSum', width: 125, valueFormatter: twoDigits },
        ],
        defaultColDef: {
          valueSetter: this.onAGGridUpdate,
          cellClassRules: {
            affected: params => this.isAffectedCell(params)
          }
        },
        getRowNodeId: data => data.id,
        onCellEditingStarted: params => this.onCellEditingStarted(params),
        onCellEditingStopped: params => this.onCellEditingStopped(params)
      },
    };
  }

  isAffectedCell(params) {
    const { affectedCells } = params.data;
    const { field } = params.colDef;

    return affectedCells && affectedCells.includes(field);
  }

  onCellEditingStarted(params) {
    this.state.highlighter.begin(params);
  }

  onCellEditingStopped(params) {
    this.state.highlighter.end(params);
  }

  onGridReady(params) {
    const { api } = params;

    let data = {};

    const listener = update => {
      data = _.merge(data, update);

      const rowData = _.map(data, (row, id) => {
        const result = Object.assign({}, row);
        const meta = rowDefsById[id].meta;

        result.id = meta.id;
        result.meta = meta;

        return result;
      });

      console.log('rowData', rowData);
      api.setRowData(rowData);
    };

    const tableModel = TableModel({ rowDefs, listener });
    const highlighter = buildHighlighter(tableModel);
    this.setState({ tableModel, highlighter });
  }

  render() {
    return (
      <div className="grid ag-theme-balham">
        <h3>Double-click on "Population" or "Food" to edit values and preview cells that will be impacted by the change</h3>
        <h3>Ex. Double-click on <i>200</i> under "Food" in the first row and change it to <i>10000</i></h3>

        <AgGridReact onGridReady={params => this.onGridReady(params)} {...this.state.agGrid} />

        <h3>
          <span className="editable-example example"/>
          Cells that are editable
        </h3>

        <h3>
          <span className="highlight-example example"/>
          Cells that will be affected by update
        </h3>

        <h3>Formulas loaded into TableModel:</h3>
        <ul>
          <li>Week = meta.id</li>
          <li>Color = meta.color</li>
          <li>Population = population</li>
          <li>Food = food</li>
          <li>Health = population / food</li>
          <li>Prev Health = prevRow(health)</li>
          <li>Health Delta = health - prevHealth</li>
          <li>Rolling Food = prevRow(rollingFood) + food</li>
          <li>Food By Color = sum('food', rowsWhere({'{'} color: meta.color {'}'}))</li>
        </ul>
      </div>
    );
  }
}
export default Grid;
