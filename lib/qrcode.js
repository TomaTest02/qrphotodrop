import QRCode from 'qrcode';

export async function generateQRCodeBuffer(url) {
  return QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: { dark: '#2d1b69', light: '#f5f0e8' },
  });
}

export async function generateQRCodeDataURL(url) {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#2d1b69', light: '#f5f0e8' },
  });
}
