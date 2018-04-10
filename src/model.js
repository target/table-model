import _ from 'lodash';

const Model = formula => {
  let model;

  if(_.isPlainObject(formula) && formula.get) {
    model = {
      getter: formula.get,
      setter: formula.set,
      value: null
    };
  } else if(_.isFunction(formula)) {
    model = {
      getter: formula,
      value: null
    };
  } else {
    // Is plain value
    model = { base: true, value: formula };

    model.getter = () => model.value;
    model.setter = () => {}; // No-op here, this will be handler in the cell setter
  }

  return model;
};

export default Model;
