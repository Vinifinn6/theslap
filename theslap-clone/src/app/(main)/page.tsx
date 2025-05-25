// src/app/(main)/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';
import Link from 'next/link';

// Definindo tipos para clareza (podem ser movidos para um arquivo types.ts no futuro)
export interface Author {
  id: string; // Auth0 ID
  username: string;
  name?: string | null;
  profileImageUrl?: string | null;
}

export interface Comment {
  id: number;
  textContent: string;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
  createdAt: string;
  user: Author; // Autor do comentário
  userId: string; // ID do autor do comentário
  postId: number; // ID do post ao qual o comentário pertence
}

export interface Post {
  id: number;
  textContent?: string | null;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
  mood?: string | null;
  createdAt: string;
  updatedAt: string;
  user: Author; // Informações do autor do post
  userId: string; // ID do autor (Auth0 sub)
  comments: Comment[]; // Array de comentários, idealmente populado se necessário
  _count?: { comments: number }; // Contagem de comentários do Prisma
}


export default function HomePage() {
  const { user, error: authError, isLoading: authLoading } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [rightNowPost, setRightNowPost] = useState<Post | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (isRightNow = false) => {
    if (!isRightNow) setFeedLoading(true);
    setFeedError(null);
    try {
      // Para "The Right Now", queremos apenas o post mais recente que não seja um comentário.
      // A API /api/posts com ?rightNow=true já deve ter essa lógica.
      const url = isRightNow ? '/api/posts?rightNow=true&limit=1' : '/api/posts?limit=10';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})); // Tenta pegar o erro do JSON
        throw new Error(errorData.error || `Falha ao buscar posts${isRightNow ? " 'The Right Now'" : " do feed"}`);
      }
      const data: Post[] = await res.json();
      if (isRightNow) {
        setRightNowPost(data.length > 0 ? data[0] : null);
      } else {
        setPosts(data);
      }
    } catch (e: any) {
      console.error(`Erro ao buscar posts ${isRightNow ? " 'The Right Now'" : "do feed"}:`, e);
      if (!isRightNow) setFeedError(e.message);
    } finally {
      if (!isRightNow) setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    // Só busca os posts se o usuário estiver logado ou se a página for pública
    // No nosso caso, o feed principal e "The Right Now" são visíveis se o usuário estiver logado.
    if (user || !authLoading) { // Considerar se o feed deve ser público ou apenas para logados
        fetchPosts(); // Fetch feed
        fetchPosts(true); // Fetch "The Right Now"
    } else if (!authLoading && !user) {
        // Limpa os posts se o usuário deslogar
        setPosts([]);
        setRightNowPost(null);
        setFeedLoading(false);
    }
  }, [fetchPosts, user, authLoading]);

  const handlePostCreated = useCallback((newPostData: any) => {
    // A API de criação de post já retorna o post com o autor e _count.comments
    const newPostWithDetails: Post = newPostData;

    setPosts(prevPosts => [newPostWithDetails, ...prevPosts]);
    // O post mais recente é sempre o "The Right Now"
    setRightNowPost(newPostWithDetails);
  }, []);

  const handlePostDeleted = useCallback((deletedPostId: number) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
    if (rightNowPost?.id === deletedPostId) {
        fetchPosts(true); // Buscar um novo "The Right Now" post
    }
  }, [rightNowPost, fetchPosts]);

  // Callback para atualizar o estado dos comentários em um post específico no feed
  const handleCommentAddedToPost = useCallback((postId: number, newComment: Comment) => {
    const mapPostAndUpdate = (currentPost: Post) => {
        if (currentPost.id === postId) {
            return {
                ...currentPost,
                comments: [newComment, ...(currentPost.comments || [])], // Adiciona no início da lista local
                _count: { comments: (currentPost._count?.comments || 0) + 1 },
            };
        }
        return currentPost;
    };
    setPosts(prevPosts => prevPosts.map(mapPostAndUpdate));
    if (rightNowPost && rightNowPost.id === postId) {
        setRightNowPost(prev => prev ? mapPostAndUpdate(prev) : null);
    }
  }, [rightNowPost]);


  if (authLoading) return <div className="loading-message container" style={{color: 'white'}}>Autenticando seu acesso ao TheSlap...</div>;
  if (authError) return <div className="error-message container">Erro de autenticação: {authError.message}. Tente recarregar a página.</div>;

  return (
    <div>
      {user && ( // Conteúdo visível apenas para usuários logados
        <>
            {/* Seção "The Right Now" */}
            <div className="right-now-section">
                <h2>🔥 THE RIGHT NOW! 🔥</h2>
                {rightNowPost ? (
                    <PostCard
                        post={rightNowPost}
                        currentUserId={user.sub}
                        onDeleteSuccess={handlePostDeleted}
                        onCommentCreated={(commentedPostId, newComment) => handleCommentAddedToPost(commentedPostId, newComment)}
                    />
                ) : (
                    <p style={{color: 'lightgray', textAlign: 'center'}}>Nenhuma atividade fervendo no momento. Publique algo! 🤘</p>
                )}
            </div>
            <PostForm onPostCreated={handlePostCreated} />
        </>
      )}
      {!user && !authLoading && ( // Mensagem para usuários não logados
        <div className="text-center" style={{ padding: '40px 20px', backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: '12px', margin: '40px auto', maxWidth: '700px', boxShadow: '0 5px 15px rgba(0,0,0,0.4)' }}>
          <h1 style={{color: '#ff8c00', fontSize: '2.8em', marginBottom: '15px'}}>Bem-vindo ao TheSlapClone!</h1>
          <p style={{color: 'white', fontSize: '1.3em', lineHeight: '1.6', marginBottom: '30px'}}>
            Onde as estrelas de Hollywood Arts (e você!) compartilham o que há de mais quente. <br/> Faça login para entrar na vibe!
          </p>
          <a href="/api/auth/login" style={{
            display: 'inline-block',
            padding: '15px 30px',
            backgroundColor: '#ff8c00',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1.2em',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 4px 10px rgba(255, 140, 0, 0.5)',
            transition: 'transform 0.2s ease, background-color 0.2s ease',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.backgroundColor = '#e07b00';}}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.backgroundColor = '#ff8c00';}}
          >Entrar ou Cadastrar!</a>
        </div>
      )}

      {user && ( // Feed de posts visível apenas para usuários logados
          <>
            <h2 style={{color: 'white', borderBottom: '2px solid #ff8c00', paddingBottom: '10px', marginTop: '40px', marginBottom: '20px'}}>Feed de Atualizações</h2>
            {feedLoading && <div className="loading-message" style={{color: 'lightgray'}}>Carregando as últimas do TheSlap...</div>}
            {feedError && <div className="error-message">Ops! Algo deu errado ao carregar o feed: {feedError}</div>}
            {!feedLoading && posts.length === 0 && (
                <p style={{color: 'lightgray', textAlign: 'center', padding: '20px'}}>
                    O feed está meio quieto... Que tal começar a festa com um novo post? 🎉
                </p>
            )}

            {posts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user.sub}
                    onDeleteSuccess={handlePostDeleted}
                    onCommentCreated={(commentedPostId, newComment) => handleCommentAddedToPost(commentedPostId, newComment)}
                />
            ))}
          </>
      )}
    </div>
  );
}