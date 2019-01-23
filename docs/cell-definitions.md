# Cell Definitions

You can define cell definitions in one of 3 flavors:

## 1. Base Value

This is the easiest method. You simply specify an initial value that you'd like the cell to be. TableModel will automatically create a `getter` and `setter` formula that will get and set this value.

```
const numCell = 13;
const stringCell = 'Hello World';
```

Base Values can be an array or an object as well

```
const arrayCell = [1, 2, 3, 4, 5];
const objCell = { name: 'James', hp: '200', gold; '1200' };
```

## 2. Getter Function

This defines a cell whose value is based off of other cells or data. The function you provide will be the getter for your cell. This getter function will be called any time the value of any of the dependant cell's values are updated. For example, the getter function will be called when either the `width` or `height` cells are updated in the same row.

The getter function takes a single argument which in an object which you can call whatever you'd like. In this case we call it `d` for `data`. This object contains all your helper functions that you can use to make it easier to write getter functions.

For example, if I wanted to reference a cell in the previous week (let's say I wanted to compare inventory levels to see how much I bought / sold) I could call `d.prevRow('inventoryCount)` which would be a lot easier than manually sorting through all the row data to find that row and cell yourself. It also makes your cell definition look cleaner and more like a mathematical formula.

The value that's returned from the getter function is the new calculated value for that cell.

Note: You will not be able to update any cell that only has a getter function.

```
const areaCell = d => d.row('width') * d.row('height');
```

Note: The previous example is shorthand for the third method and is the same as not specifing a setter:

```
const areaCell = {
  get: d => d.row('width') * d.row('height');
}
```  
  
Somtimes you may want to reference what the previous value of the cell was.  
Using `d.row('areaCell')` would cause infinitely recursing function calls so you can reference the old value like so:    
```
const areaCell = {
  get: (d, oldValue) => // do something
}
```

## 3. Getter/Setter Object

This is the option that gives you the most flexibility. This is done by defining an object with both a `get` property with the cell's getter function and a `set` property with the cell's setter function. This is useful if you want equations or formulas which can be manipulated both ways.

For example: If I have a row that has `width`, `height` and `area`, a simple set of cell definitions might look like this:

```
const rowDefinition = {
  width: 100,
  height: 20,
  area: d => d.row('width') * d.row('height')
}
```

However, we learned from the last section that I can't update a cell that only has a getter function, as is the case with `area`. However, we know that mathematically I __COULD__ change the area and then update the width or height to balance the equation.

We can do this with TableModel be specifing a setter function with `set`:

```
const rowDefinition = {
  width: 100,
  height: 20,
  area: {
   get: d => d.row('width') * d.row('height')
   set: (d, value, oldValue) => d.set(value / d.row('width'), d.cells.row('height'))
  }
}
```

Note: I'm using `data.cells.row('height')` instead of `data.row('height')` since the latter would return the value, but I want to reference the cell. `data.cells` includes a set of helper functions which return cells instead of cells values that you can use for these special setter function helpers.

You should recognize the getter function from the previous example. It's exactly the same, we've just moved it to the `get` property in our object.

We've also added a `set` property with our setter function. A setter function takes 3 arguments, `[data, value, oldValue]` where `data` is the same argument passed to the getter function. The `value` is the new value the cell is being updated to and the `oldValue` is the value of the cell before the update.

### The `data.set(value, cells)` helper

What's going on in our setter function is that we're calling a special helper function called `set`. The `set` helper takes two arguments, a value for the first argument and a cell or array of cells for the second argument. Calling `set(value, cells)` will update all the given cells with the value provided.

Going back to our example, we can see that the initial value of `area` would be `2000`. If we update `area` to `3000`, we see that the setter function would take that new value of `3000`, divide it by the current `width` which is `100` to get a value of `30`. We take this value of `30` and set it to the cell in the second argument of `set` which is height. After our update our row would look like this:

```
// Inital row values are:
{
  width: 100,
  height: 20,
  area: 2000
}

tableModel.update({ myRow: { area: 3000 }});

// Final row values are
{
  width: 100,
  height: 30, // Included in update
  area: 3000  // Included in update
}
```

### The `data.spread(value, cells)` helper

The `spread` method is another special function you'll probably only ever use in setter functions. It takes similar arguments as `set` except it will *"spread"* the given value over the given cells instead of setting the value. What that means is that it would increase or decrease each cells value proportionally. This is seen from the following example:

```
const rowDefinition = {
  a: 100,
  b: 200,
  c: 300,
  d: 400
  total: {
   get: d => d.row('a') + d.row('b') + d.row('c') + d.row('d');
   set: (d, value, oldValue) => {
    const allcells = [d.row('a'), d.row('b'), d.row('c'), d.row('d')];
    d.spread(value - oldValue, allCells);
   }
  }
}

// Inital row values are:
{
  a: 100,
  b: 200,
  c: 300,
  d: 400
  total: 1000
}

tableModel.update({ myRow: { total: 1500 }});

// Final row values are
{
  a: 150,
  b: 300,
  c: 450,
  d: 600
  total: 1500
}
```

Note: It's important to note that the `value` in `spread` is `500` which represents the amount of the change instead of the final value itself.
