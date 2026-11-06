export async function renderQr(text) {
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 560, color: { dark: '#0f172a', light: '#ffffff' } });
}
