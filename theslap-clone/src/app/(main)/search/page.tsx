// src/app/(main)/search/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import PostCard from '@/components/PostCard';
import UserAvatar from '@/components/UserAvatar';
import { Post, Comment as CommentType, Author } from '@/app/(main)/page'; // Reutilizando interfaces
import { useUser } from '@auth0/nextjs-auth0/client';

interface UserSearchResult extends Author {} // Para resultados de busca de usuários

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const { user: loggedInUser } = useUser();

  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query) {
      setLoading(true);
      setError(null);
      setUserResults([]);
      setPostResults([]);

      const fetchSearchResults = async () => {
        try {
          // Buscar usuários (exemplo: /api/users?searchQuery=...)
          // Você precisará adaptar sua API /api/users/route.ts para aceitar um parâmetro 'searchQuery'
          // que busca por username ou name.
          const userSearchPromise = fetch(`/api/users?searchQuery=${encodeURIComponent(query)}`)
            .then(res => res.ok ? res.json() : []); // Retorna array vazio em caso de erro para não quebrar Promise.all

          // Buscar posts (exemplo: /api/posts?searchQuery=...)
          // Você precisará adaptar sua API /api/posts/route.ts para aceitar 'searchQuery'
          // que busca no textContent dos posts.
          const postSearchPromise = fetch(`/api/posts?searchQuery=${encodeURIComponent(query)}`)
            .then(res => res.ok ? res.json() : []);

          const [users, posts] = await Promise.all([userSearchPromise, postSearchPromise]);

          setUserResults(users as UserSearchResult[]); // Faça a conversão de tipo se necessário
          setPostResults(posts as Post[]); // Faça a conversão de tipo se necessário

        } catch (err) {
          console.error("Erro ao buscar resultados:", err);
          setError("Ocorreu um erro ao buscar. Tente novamente.");
        } finally {
          setLoading(false);
        }
      };

      fetchSearchResults();
    }
  }, [query]);

  const handlePostDeletedOnSearch = (deletedPostId: number) => {
    setPostResults(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
  };

  const handleCommentAddedToPostOnSearch = (postId: number, newComment: CommentType) => {
    setPostResults(prevPosts =>
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
  };


  if (loading) {
    return <p className="loading-message">Buscando por "{query}"...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (!query) {
    return <p style={{textAlign: 'center', color: 'lightgray', marginTop: '20px'}}>Digite algo na barra de busca acima para começar.</p>;
  }

  return (
    <div className="search-results-container">
      <h1 style={{color: 'white', borderBottom: '1px solid #ff8c00', paddingBottom: '10px'}}>Resultados da Busca por: "{query}"</h1>

      {userResults.length > 0 && (
        <section>
          <h2>Usuários Encontrados</h2>
          {userResults.map(user => (
            <div key={user.id} className="user-search-card">
              <UserAvatar username={user.username} profileImageUrl={user.profileImageUrl} size={50} linkToProfile />
              <div>
                <Link href={`/@${