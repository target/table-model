const Transaction = (options = {}) => {
  const init = options.init || false;
  const dryRun = options.dryRun || false;

  return { init, cellStack: [], dryRun, stale: {}, updates: {} };
};

export default Transaction;
