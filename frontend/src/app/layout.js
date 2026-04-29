import './globals.css';

export const metadata = {
  title: 'Trazaap',
  description: 'Sistema interno de trazabilidad Home Bagel'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
