import _ from 'lodash';

const validate = (data, rowsById) => {
  const errors = [];

  _.each(data, (updateRow, rowId) => {
    _.each(updateRow, (value, cellName) => {
      // Get Dependents for each update
      const row = rowsById[rowId];
      const cell = row[cellName];

      // VALIDATION: Check that cell exists for update
      if(cell === undefined) {
        const msg = `Cell "${cellName}" @ row ${rowId} does not exist`;
        errors.push({ msg, row: rowId, cell: cellName });
        return;
      }

      // VALIDATION: Check for update conflict
      const { dependents } = cell;
      dependents.forEach(cell => {
        const uRowId = cell.data.row.meta.id;
        const uRow = data[uRowId];

        const { cellName: depCellName } = cell.data;
        if(uRow && uRow[depCellName]) {
          const msg = `Can't update "${cellName}" @ row ${rowId} and ` +
            `"${depCellName}" @ row ${uRowId} at the same time`;
          errors.push({
            msg,
            rowA: rowId, cellA: cellName,
            rowB: uRowId.toString(), cellB: depCellName
          });
        }
      });

      // VALIDATION: Check for updates on read-only cells
      if(!cell.hasSetter) {
        const msg = `Can't update "${cellName}" @ row ${rowId}`;
        errors.push({ msg, row: rowId, cell: cellName });
      }
    });
  });

  return errors;
};

export default validate;
