// src/app/(main)/messages/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import UserAvatar from '@/components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Contact {
  user: {
    id: string; // Auth0 ID do contato
    username: string;
    name?: string | null;
    profileImageUrl?: string | null;
  };
  lastMessage?: string | null; // Preview da última mensagem
  lastMessageAt?: string | null; // Timestamp da última mensagem
}

export default function MessagesListPage() {
  const { user, isLoading: authLoading } = useUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.sub) {
      setLoading(true);
      setError(null);
      fetch('/api/messages') // API para listar contatos/conversas
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Falha ao carregar lista de conversas.");
          }
          return res.json();
        })
        .then((data: Contact[]) => {
          setContacts(data);
        })
        .catch(err => {
          setError(err.message);
          console.error("Erro ao buscar contatos:", err);
        })
        .finally(() => setLoading(false));
    } else if (!authLoading && !user) {
        // Se não está autenticando e não há usuário, para de carregar
        setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <div className="loading-message container" style={{color: 'white'}}>Carregando suas mensagens...</div>;
  }

  if (error) {
    return <div className="error-message container">{error}</div>;
  }

  if (!user) {
    return (
      <div className="container text-center" style={{color: 'white'}}>
        <p>Você precisa estar logado para ver suas mensagens.</p>
        <Link href="/api/auth/login" className="auth-button-style">Fazer Login</Link>
      </div>
    );
  }

  return (
    <div className="messages-list-container" style={{maxWidth: '700px', margin: '0 auto'}}>
      <h1 style={{color: 'white', borderBottom: '1px solid #ff8c00', paddingBottom: '10px'}}>Suas Conversas</h1>
      {contacts.length === 0 && (
        <p style={{textAlign: 'center', color: 'lightgray', marginTop: '20px'}}>
          Você ainda não tem nenhuma conversa. Envie uma mensagem para alguém!
        </p>
      )}
      <div className="chat-contact-list">
        {contacts.map(contact => (
          <Link key={contact.user.id} href={`/messages/${contact.user.id}`} className="chat-contact-item" style={{textDecoration: 'none', color: 'inherit', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center'}}>
            <UserAvatar
                username={contact.user.username}
                profileImageUrl={contact.user.profileImageUrl}
                size={50}
            />
            <div style={{marginLeft: '15px', flexGrow: 1}}>
              <strong style={{color: '#0a1832'}}>{contact.user.name || `@${contact.user.username}`}</strong>
              <p style={{fontSize: '0.9em', color: '#555', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {contact.lastMessage || "Nenhuma mensagem ainda."}
              </p>
            </div>
            {contact.lastMessageAt && (
                <span style={{fontSize: '0.75em', color: '#777', marginLeft: '10px', whiteSpace: 'nowrap'}}>
                    {formatDistanceToNow(new Date(contact.lastMessageAt), { addSuffix: true, locale: ptBR })}
                </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}