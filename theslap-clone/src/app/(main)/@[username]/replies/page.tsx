// src/app/(main)/@[username]/replies/page.tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserAvatar from '@/components/UserAvatar'; // Usando UserAvatar
import { Comment as CommentType, Author as AuthorType } from '@/app/(main)/page'; // Reutilizando interfaces

interface UserReply extends CommentType {
  post: { // Informações do post original ao qual a resposta pertence
    id: number;
    textContent?: string | null;
    user: AuthorType; // Autor do post original
  };
}

export default function UserRepliesPage() {
  const params = useParams();
  const usernameFromParams = params.username as string;

  const [userReplies, setUserReplies] = useState<UserReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileAndReplies = useCallback(async () => {
    if (!usernameFromParams) return;
    setLoading(true);
    setError(null);
    try {
      const userRes = await fetch(`/api/users?username=${usernameFromParams.toLowerCase()}`);
      if (!userRes.ok) {
        const errData = await userRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Usuário do perfil não encontrado para buscar respostas.');
      }
      const userData = await userRes.json();

      const repliesRes = await fetch(`/api/users/${userData.id}/replies`);
      if (!repliesRes.ok) {
        const errData = await repliesRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao buscar respostas do usuário.');
      }
      const repliesData = await repliesRes.json();
      setUserReplies(repliesData);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao carregar respostas do perfil:", err);
    } finally {
      setLoading(false);
    }
  }, [usernameFromParams]);

  useEffect(() => {
    fetchProfileAndReplies();
  }, [fetchProfileAndReplies]);

  if (loading) return <div className="loading-message">Carregando respostas de @{usernameFromParams}...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      {userReplies.length === 0 && (
        <p style={{ textAlign: 'center', color: 'lightgray', marginTop: '20px' }}>
          @{usernameFromParams} ainda não respondeu a nenhum post. Participe da conversa! 💬
        </p>
      )}
      {userReplies.map(reply => (
        <div key={reply.id} className="card comment-card" style={{marginBottom: '15px'}}> {/* Usando estilo de card de comentário */}
          <div className="card-header">
            <UserAvatar
                username={reply.user.username}
                profileImageUrl={reply.user.profileImageUrl}
                size={35}
                linkToProfile
            />
            <div style={{marginLeft: '10px'}}>
              <Link href={`/@${reply.user.username}`} className="username">
                @{reply.user.username}
              </Link>
              {reply.user.name && <span className="name" style={{fontSize: '0.85em'}}> ({reply.user.name})</span>}
              <span className="timestamp" style={{fontSize: '0.75em', marginLeft: '10px', color: '#666'}}>
                {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>

          <div className="reply-context" style={{fontSize: '0.9em', color: '#555', margin: '8px 0', paddingLeft: '45px'}}>
            Em resposta a{' '}
            <Link href={`/@${reply.post.user.username}`} style={{fontWeight: 'bold', color: '#007bff'}}>
                @{reply.post.user.username}
            </Link>
            {/* Idealmente, um link para o post específico: /posts/${reply.post.id} */}
            {reply.post.textContent && (
                <span style={{fontStyle: 'italic'}}>: "{reply.post.textContent.substring(0, 70)}{reply.post.textContent.length > 70 ? '...' : ''}"</span>
            )}
          </div>

          {reply.textContent && <p className="card-content" style={{paddingLeft: '45px', marginBottom: '8px'}}>{reply.textContent}</p>}

          {(reply.imageUrl1 || reply.imageUrl2) && (
            <div className="card-images" style={{paddingLeft: '45px', marginTop: '5px', gap: '5px'}}>
              {reply.imageUrl1 && <Image src={reply.imageUrl1} alt="Imagem da resposta 1" width={120} height={120} style={{objectFit: 'cover', borderRadius: '4px'}}/>}
              {reply.imageUrl2 && <Image src={reply.imageUrl2} alt="Imagem da resposta 2" width={120} height={120} style={{objectFit: 'cover', borderRadius: '4px'}}/>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}