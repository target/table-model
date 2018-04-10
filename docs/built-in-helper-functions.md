# Built-in Helper Functions

## Cell Helpers
These functions return a cell's value or an array of cell values to be used in getter and setter functions.

  __Note:__ These helpers are the helper functions that you can supply at initialization that are wrapped to return cell values instead of the cells themselves. These helpers should not be used to supply cell arguments to setter helpers.

* __row(cellName)__

  Returns a single cell's value from the current row by name

* __prevRow(cellName)__

  Returns a single cell's value from the previous row by name

* __rowsWhere(criteria, cellName)__

  Returns a cell's value from each row by name where criteria matches the metadata attributes found on each row. For example if I call `rowsWhere({ color: red, even: true }, 'count')` it will return the `count` cell from every row that has at least the `color: red` and `even: true` properties in the row's `meta` object.

  Note: ALL properties given in `criteria` must match for the row to match the rule and return it's cell.

## Setter Helpers
These functions update cells based on the given values.

* __set(value, cells)__

  Updates all cells with the given value. `cells` can either be a single cell or an array of cells

* __spread(value, cells)__

  Increments or decrements an array of cells proportionally to each other

* __data.cells__

  This in an object that contains pure copies of the cell helper functions that return cells instead of cell values. These should be used for getting references to cells to pass to setter helper functions.

## Other Helpers

* __meta(name)__

  Returns the meta property for the given row. For example, if the metadata for my current row is:
  ```
  { a: 123, b: 'hello' }
  ```
  calling `meta('a')` will return `123` for all cells in that row.

* __preLink()__

  Returns a reference to the preLink data returned by the `preLink` function provided at initialization.
