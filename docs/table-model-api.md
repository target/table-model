# TableModel API

## const tableModel = TableModel({ rowDefs, helpers, listener, preLink })

- __rowDefs: (Required)__ This is an array of row definitions which define the data and/or formulas that will be used in the underlying cells. A row definition takes the form of an object `{ meta: {}, cells {} }` where `meta` is an object of generic data specific to the row and `cells` is an object where the keys are the cell name and the values are the cell definition.

  ```
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
  ```
- __helpers:__ You can provide an optional object here to extend the built-in helper functions which are available for use in your cell definitions. This is an object where the keys are the helper name and the values are helper functions. The helper functions take the form of a function that returns a function which returns a cell or an array of cells.

  ```
  const helpers = {
    byColor: input => {
      return cellName => {
        const thisColor = input.meta.color;
        const rows = input.rows;

        return rows.filter(row => row.meta.color === thisColor).map(row => row[cellName]);
      };
    }
  }

  ```

  The outer function gets called with an `input` argument that contains various data that is avilable to the helper method. The contents of the `input` may be different for each invocation depending on the cell in which the helper is called.

  The inner function is the function that actually gets used and called in the cell definitions. This function can have whatever arguments you'd like to provide to the user.

  __IMPORTANT:__
  The return value of the inner function must be either a cell or an array of cells. Table model will automatically resolve the value of the cell for use in the formula.

- __listener:__ You can specify an optional listener here at initialization that will be called with the first cell update that will include a complete set of all the values for all the cells in your table. If you use the `tableModel.listen(listenerFn)` to add a listener after TableModel has been initialized, it will receive later updates, but not the first complete update.

- __prelink:__ You can specify an optional callback function here. This preLink function will be called __AFTER__ all the cells have been built but __BEFORE__ the linking and initial calculation process has started. The prelink function is called with an array of rows containing cell objects instead of cell definitions. Any data returned by this method is made available to helper functions via the `input` argument. This is useful if you'd like to build a cache of cells to use in helper functions or to perform any other optimizations here.

  An example of a good use case for this would be taking an array of rows that represent certain days and grouping them by month and storing the results in an object. A helper function can use this cache to do faster lookups for all days that are in a given week instead of searching the entire dataset over and over again each time the helper method is called.

  ```
  const prelink = rows => {
    const daysInMonth = _.groupBy(rows, row => row.meta.month);
    return { daysInMonth };
  }
  ```
  ... and in your helper method ...
  
  ```
  const helpers = {
    monthDays: input => {
      return (month, cellName) => {
        const daysInMonth = input.preLink.daysInMonth;
        const dayRows = daysInMonth(month);
        const cells = dayRows.map(row => row[cellName]);
        return cells;
      }
    }
  };
  ```
  ... and in your cell definition ...
  
  ```
  const monthTotal = d => {
    const pointsForAllDaysInMonth = d.monthDays(10, 'points');
    const total = pointsForAllDaysInMonth.reduce((x, y) => x + y);
    return total;
  }
  ```

## tableModel.listen(listenerFn)
This adds a listener function to TableModel that will be called with all subsequent updates. Each listener function gets called with an object where the keys are the row ids and the values are an object containing the new values for any cells in that row that were updated by the last update. The first update returned by TableModel will include a complete set of the values of all cells like so:

```
{
  1: { a: 10, b: 20, c: 30, total: 60 },
  2: { a: 12, b: 45, c: 38, d: 1234, total: 95, extra: 1710 },
  3: { a: 100, b: 200, c: 300, total: 600 },
  4: { redTotal: 660, greenTotal: 95 }
}
```

Subsequent updates will contain only the rows and cells that were impacted by the update:

```
{
  2: { c: 123, total: 180, extra: 5535 },
  4: { greenTotal: 180 }
}
```

Note: In order to catch the first complete update from TableModel, your listener must be added at initialization. If you use this method, your listener won't be added in time to receive the first complete update.

## tableModel.update(changes)
This triggers an update on TableModel and will update or set all values supplied. The only argument is an object which is similar in structure to the objects received by the listener functions: the object keys being row ids and the object values being key-value pairs of the cellNames and values of those cells to be updated.

```
table.update({
  2: { a: 123, c: 456 }
  3: { b: 789 }
});
```

If this update contains a cell that can't be updated (either because it's not a "base value" equation) or because it has no setter in its equation) it'll throw an exception with details. An exception will also be thrown if TableModel notices that you are trying to update a cell which would also be impacted by an update of another cell, since the values of these updates might not match.

## tableModel.willAffect(changes)
This method takes the exact same argument type as `tableModel.update(changes)`. However, instead of triggering an update it will perform a "dry run" on the cells instead and keep track of which cells are impacted by the update without actually updating the values of any cells. This allows you to do "update prediction" allowing you check which cells will be affected by a call to `tableModel.update(changes)` before you actually make the update.

The value returned by this function is an object where the keys are row ids and the values are an array of cellNames which represent the cells in that row that would be affected by the update.

```
let affectedCells = tableModel.willAffect({ 2: { asp: 10 } });
console.log(affectedCells);

// Outputs:
{
  2: ['asp', 'doubleAsp', 'sales'],
  3: ['prevDoubleAsp']
}
```

## tableModel.rows
You can access the rows object directly from the instance object. You should not make changes to this object after initialization. You should supply a `preLink` function if you'd like to make changes or optimizations to the cells before linking.

## tableModel.preLinkData
You can access the preLinkData directly from the instance object. You should not make changes to this object after initialization.
