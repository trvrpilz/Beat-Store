import './globals.css';

export const metadata = {
  title: 'Trevor Pilz — Beats',
  description: 'License original beats from Trevor Pilz.',
  referrer: 'no-referrer'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
