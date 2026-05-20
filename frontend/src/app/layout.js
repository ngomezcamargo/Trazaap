import './globals.css';

export const metadata = {
  title: 'Trazaap',
  description: 'Sistema interno de trazabilidad Home Bagel',
  icons: {
    icon: '/trazaap-logo.jpeg',
    apple: '/trazaap-logo.jpeg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
