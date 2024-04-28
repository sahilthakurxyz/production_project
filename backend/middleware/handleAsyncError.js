module.exports = (handleAsyncOperation) => (req, res, next) => {
  Promise.resolve(handleAsyncOperation(req, res, next)).catch(next);
};
