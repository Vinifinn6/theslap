// src/components/AuthButton.tsx
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';

export default function AuthButton() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <button disabled style={{padding: '8px 12px', fontSize: '0.9em'}}>Carregando...</button>;
  }

  if (user) {
    return (
      <Link href="/api/auth/logout" style={{
        padding: '8px 12px',
        backgroundColor: '#e07b00',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px',
        fontSize: '0.9em',
        fontWeight: 'bold',
      }}>
        Sair
      </Link>
    );
  }

  return (
    <Link href="/api/auth/login" style={{
      padding: '8px 12px',
      backgroundColor: '#ff8c00',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '4px',
      fontSize: '0.9em',
      fontWeight: 'bold',
    }}>
      Login / Cadastro
    </Link>
  );
}