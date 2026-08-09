function notFoundHandler(req, res) {
  const t = res.locals.t || ((key) => key);
  res.status(404).render('error', {
    title: t('error.notFoundTitle'),
    statusCode: 404,
    message: t('error.notFoundMessage')
  });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const t = res.locals.t || ((key) => key);
  res.status(err.status || 500).render('error', {
    title: t('error.title'),
    statusCode: err.status || 500,
    message: err.publicMessage || t('error.message')
  });
}

module.exports = { notFoundHandler, errorHandler };
