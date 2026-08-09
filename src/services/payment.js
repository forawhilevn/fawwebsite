function listMethods(t) {
  return [
    { key: 'vietqr', label: t('checkout.paymentMethod.vietqr') },
    { key: 'cod', label: t('checkout.paymentMethod.cod') }
  ];
}

function buildVietQrUrl(order) {
  const bankId = process.env.VIETQR_BANK_ID || '';
  const accountNo = process.env.VIETQR_ACCOUNT_NO || '';
  const template = process.env.VIETQR_TEMPLATE || 'compact2';
  const accountName = encodeURIComponent(process.env.VIETQR_ACCOUNT_NAME || '');
  const addInfo = encodeURIComponent(order.order_code);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${order.total}&addInfo=${addInfo}&accountName=${accountName}`;
}

function getInstructions(order, t) {
  if (order.payment_method === 'vietqr') {
    return {
      method: 'vietqr',
      qrImageUrl: buildVietQrUrl(order),
      bankName: process.env.VIETQR_BANK_ID || '',
      accountName: process.env.VIETQR_ACCOUNT_NAME || '',
      accountNumber: process.env.VIETQR_ACCOUNT_NO || '',
      note: order.order_code
    };
  }

  return {
    method: 'cod',
    lines: [t('order.codInstructions'), `${t('order.code')}: ${order.order_code}`]
  };
}

module.exports = { listMethods, buildVietQrUrl, getInstructions };
