import _ from 'lodash';

import Model from './model';
import Transaction from './transaction';

import { buildHelperFactory } from './utils';

const Cell = ({ id, formula, data, helperFns }) => {
  const cell = {
    id,
    dependents: [],
    dependencies: [],
    setterDependents: []
  };

  const model = Model(formula);
  const helperFactory = buildHelperFactory(helperFns, data);

  const get = (trx = {}) => {
    const { cellStack, dryRun, init, stale, updates } = trx;

    // Add and link dependant
    if(init) {
      const dependentCell = cellStack[cellStack.length - 1];

      if(dependentCell) {
        cell.dependents.push(dependentCell);
        dependentCell.dependencies.push(cell);
      }
    }

    const isStale = stale && stale[id] !== undefined;
    if(!isStale) {
      // Only call this getter once per transaction
      if(updates && updates[id] !== undefined)
        return updates[id];

      // If not stale, return cached model value
      if(!updates || !init)
        return model.value;
    }

    // Update helpers with current trx
    const helpers = helperFactory(trx);

    if(cellStack)
      cellStack.push(cell);
    const value = model.getter(helpers, model.value);
    if(cellStack)
      cellStack.pop();

    // Update model
    if(!dryRun)
      model.value = value;

    // Update trx
    if(updates) {
      updates[id] = value;
      delete stale[id];
    }

    // Mark dependents as stale and update
    if(updates && !init && stale) {
      cell.dependents.forEach(dep => {
        const cellId = dep.id;

        if(updates[cellId] === undefined)
          stale[cellId] = dep;
      });
    }

    return value;
  };

  let set;
  if(model.setter) {
    set = (value, trx) => {
      // Only call this setter once per transaction
      const { cellStack, dryRun, stale, updates } = trx;
      if(updates && updates[id])
        return;

      // Update helpers with current trx
      const helpers = helperFactory(trx);

      // Placeholder
      updates[id] = true;

      // Update this cell
      if(cellStack)
        cellStack.push(cell);
      model.setter(helpers, value, model.value);
      if(cellStack)
        cellStack.pop();

      // Update model and trx
      if(!dryRun)
        model.value = value;

      // Update trx
      updates[id] = value;
      delete stale[id];

      // Update dependants
      if(stale) {
        cell.dependents.forEach(dep => {
          const cellId = dep.id;

          if(updates[cellId] === undefined)
            stale[cellId] = dep;
        });
      }

      // Process stale cells
      if(cellStack.length === 0) {
        while(_.size(stale))
          _.values(stale).forEach(cell => cell.get(trx));
      }
    };
  } else {
    set = () => {
      throw new Error('This cell doesn\'t have a setter');
    };
  }

  const willAffect = () => {
    const trx = Transaction({ dryRun: true });
    set(model.value, trx);

    return trx.updates;
  };

  const hasSetter = model.setter !== undefined;
  Object.assign(cell, { data, get, set, hasSetter, willAffect });
  return cell;
};

export default Cell;
