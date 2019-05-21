import _ from 'lodash';

export const isSuperSet = (a, b) => {
  const picked = _.pick(a, _.keys(b));
  return _.isEqual(picked, b);
};

const mapCellHelperToValueHelper = (cellHelper, input) => {
  return (...args) => {
    const cells = cellHelper(...args);

    const { trx } = input;

    let result;
    if(_.isArray(cells))
      result = cells.map(cell => cell.get(trx));
    else
      result = cells ? cells.get(trx) : null;

    return result;
  };
};

export const buildHelperFactory = helperFns => {
  const { cellHelpers, otherHelpers } = helperFns;

  // Build input
  const input = {};

  const boundCellHelpers = _.mapValues(cellHelpers, helperBuilder => helperBuilder(input));
  const boundOtherHelpers = _.mapValues(otherHelpers, helperBuilder => helperBuilder(input));

  const boundValueHelpers = _.mapValues(boundCellHelpers, cellHelper => mapCellHelperToValueHelper(cellHelper, input));

  const result = Object.assign({}, boundValueHelpers, boundOtherHelpers);
  result.cells = boundCellHelpers;

  return (trx, data) => {
    Object.assign(input, data);
    input.trx = trx;
    return result;
  };
};
