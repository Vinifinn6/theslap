// src/app/(main)/@[username]/page.tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import PostCard from '@/components/PostCard';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Post, Comment as CommentType } from '@/app/(main)/page'; // Reutilizando interfaces

export default function UserPostsPage() {
  const params = useParams();
  const usernameFromParams = params.username as string;
  const { user: loggedInUser } = useUser();

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const fetchProfileAndPosts = useCallback(async () => {
    if (!usernameFromParams) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar o ID do usuário pelo username
      const userRes = await fetch(`/api/users?username=${usernameFromParams.toLowerCase()}`);
      if (!userRes.ok) {
        const errData = await userRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Usuário do perfil não encontrado.');
      }
      const userData = await userRes.json();
      setProfileUserId(userData.id);

      // 2. Buscar os posts do usuário usando o ID obtido
      const postsRes = await fetch(`/api/users/${userData.id}/posts`);
      if (!postsRes.ok) {
        const errData = await postsRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Falha ao buscar posts do usuário.');
      }
      const postsData = await postsRes.json();
      setUserPosts(postsData);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao carregar posts do perfil:", err);
    } finally {
      setLoading(false);
    }
  }, [usernameFromParams]);

  useEffect(() => {
    fetchProfileAndPosts();
  }, [fetchProfileAndPosts]);

  const handlePostDeletedOnProfile = useCallback((deletedPostId: number) => {
    setUserPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  }, []);

  const handleCommentAddedToPostOnProfile = useCallback((postId: number, newComment: CommentType) => {
    setUserPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [newComment, ...(p.comments || [])],
            _count: { comments: (p._count?.comments || 0) + 1 },
          };
        }
        return p;
      })
    );
  }, []);

  if (loading) return <div className="loading-message">Carregando posts de @{usernameFromParams}...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      {userPosts.length === 0 && (
        <p style={{ textAlign: 'center', color: 'lightgray', marginTop: '20px' }}>
          @{usernameFromParams} ainda não tem nenhuma postagem. Hora de brilhar! ✨
        </p>
      )}
      {userPosts.map(post => (
        <PostCard
            key={post.id}
            post={post}
            currentUserId={loggedInUser?.sub}
            onDeleteSuccess={handlePostDeletedOnProfile}
            onCommentCreated={(commentedPostId, newComment) => handleCommentAddedToPostOnProfile(commentedPostId, newComment)}
        />
      ))}
    </div>
  );
}