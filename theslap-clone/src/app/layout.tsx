// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { UserProvider } from '@auth0/nextjs-auth0/client';
import './globals.css'; // Seus estilos globais

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TheSlapClone',
  description: 'Uma rede social inspirada em Victorious, by ViniFinn6',
  // Você pode adicionar mais metadados aqui, como open graph, etc.
  // icons: {
  //   icon: '/favicon.ico', // Certifique-se de ter um favicon.ico em public/
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <UserProvider> {/* Envolve com UserProvider para o Auth0 funcionar no lado do cliente */}
        <body className={`${inter.className} theslap-background`}> {/* Aplica a classe de fundo aqui */}
          {children}
        </body>
      </UserProvider>
    </html>
  );
}