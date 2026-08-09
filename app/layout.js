export const metadata = {
  title: 'Muya',
  description: 'Muya',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
