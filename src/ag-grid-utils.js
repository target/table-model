import _ from 'lodash';

export const initAgGridData = (agGridApi, tableModelUpdate) => {
  const rowData = _.map(tableModelUpdate, (cells, rowId) => {
    const gridRow = { ...cells };
    gridRow.id = parseInt(rowId, 10);
    return gridRow;
  });

  agGridApi.setRowData(rowData);
};

export const updateAgGrid = (agGridApi, tableModelUpdate) => {
  _.each(tableModelUpdate, (rowUpdates, rowId) => {
    const node = agGridApi.getRowNode(rowId);

    let { data } = node;
    data = Object.assign(data, rowUpdates);
    node.setData(data);
  });
};

const noValueChange = params => params.newValue === params.oldValue;

export const updateTable = (table, agGridUpdate) => {
  const rowId = agGridUpdate.node.id;
  const cell = agGridUpdate.colDef.field;

  if(noValueChange(agGridUpdate))
    return;

  const update = {};
  update[rowId] = {};
  update[rowId][cell] = agGridUpdate.newValue;

  table.update(update);
};

export const buildHighlighter = tableModel => {
  let affectedRows = null;

  const begin = params => {
    const rowId = params.data.id;
    const cellName = params.colDef.field;
    const { api } = params;

    const update = {};
    update[rowId] = {};
    update[rowId][cellName] = null;

    affectedRows = tableModel.willAffect(update);

    const rowNodes = [];
    _.each(affectedRows, (affectedCells, rowId) => {
      const node = params.api.getRowNode(rowId);

      if(node) {
        const { data } = node;
        data.affectedCells = affectedCells;
        rowNodes.push(node);
      }
    });
    api.refreshCells({ rowNodes, force: true });
  };

  const end = params => {
    const rowNodes = [];
    const { api } = params;
    _.each(affectedRows, (affectedCells, rowId) => {
      const node = params.api.getRowNode(rowId);
      if(node) {
        delete node.data.affectedCells;
        rowNodes.push(node);
      }
    });
    api.refreshCells({ rowNodes, force: true });
    affectedRows = null;
  };

  return { begin, end };
};
