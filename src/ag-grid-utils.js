import _ from 'lodash';

const initAgGridData = (agGridApi, tableModelUpdate) => {
  const rowData = _.map(tableModelUpdate, (cells, rowId) => {
    const gridRow = Object.assign({}, cells);
    gridRow.id = parseInt(rowId, 10);
    return gridRow;
  });

  agGridApi.setRowData(rowData);
};

const updateAgGrid = (agGridApi, tableModelUpdate) => {
  _.each(tableModelUpdate, (rowUpdates, rowId) => {
    const node = agGridApi.getRowNode(rowId);

    let data = node.data;
    data = Object.assign(data, rowUpdates);
    node.setData(data);
  });
};

const noValueChange = params => {
  const newValue = parseFloat(params.newValue);
  const oldValue = parseFloat(params.oldValue);
  return newValue === oldValue;
};

const updateTable = (table, agGridUpdate) => {
  const rowId = agGridUpdate.node.id;
  const cell = agGridUpdate.colDef.field;
  const newValue = parseFloat(agGridUpdate.newValue);
  if(noValueChange(agGridUpdate))
    return;

  const update = {};
  update[rowId] = {};
  update[rowId][cell] = newValue;

  table.update(update);
};

export { initAgGridData, updateAgGrid, updateTable };
