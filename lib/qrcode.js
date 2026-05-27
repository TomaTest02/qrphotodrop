import QRCode from 'qrcode';

export async function generateQRCodeBuffer(url) {
  return QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: { dark: '#2d2c4a', light: '#faf7f2' },
  });
}

export async function generateQRCodeDataURL(url) {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#2d2c4a', light: '#faf7f2' },
  });
}
