function notFoundHandler(req, res) {
  const t = res.locals.t || ((key) => key);
  res.status(404).render('error', {
    title: t('error.notFoundTitle'),
    statusCode: 404,
    message: t('error.notFoundMessage')
  });
}

function wantsJson(req) {
  return req.headers['x-requested-with'] === 'fetch' || String(req.headers.accept || '').indexOf('application/json') !== -1;
}

function errorHandler(err, req, res, next) {
  console.error(err);
  let status = err.status || 500;
  let message = err.publicMessage;
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File quá lớn. Hãy giảm kích thước rồi thử lại.';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = 'Tải file thất bại (' + err.message + ').';
  }
  if (wantsJson(req)) {
    return res.status(status).json({ ok: false, error: message || 'Có lỗi xảy ra, vui lòng thử lại.' });
  }
  const t = res.locals.t || ((key) => key);
  res.status(status).render('error', {
    title: t('error.title'),
    statusCode: status,
    message: message || t('error.message')
  });
}

module.exports = { notFoundHandler, errorHandler };
