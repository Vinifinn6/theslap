// src/app/(main)/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';
import Link from 'next/link';

// Definindo tipos para clareza (podem ser movidos para um arquivo types.ts)
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
  user: Author;
  userId: string;
  postId: number;
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
  comments: Comment[]; // Array de comentários
  _count?: { comments: number };
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
      const url = isRightNow ? '/api/posts?rightNow=true&limit=1' : '/api/posts?limit=10';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
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
    fetchPosts(); // Fetch feed
    fetchPosts(true); // Fetch "The Right Now"
  }, [fetchPosts]);

  const handlePostCreated = useCallback((newPostData: any) => {
    // O endpoint de criação de post deve retornar o post com o usuário e _count.comments
    const newPostWithAuthor: Post = {
      ...newPostData,
      user: { // Assumindo que o user logado é o autor
        id: user!.sub!,
        username: user!.nickname || 'Usuário', // Pegar do perfil se disponível, ou um placeholder
        name: user!.name,
        profileImageUrl: user!.picture,
      },
      comments: [], // Novo post não tem comentários ainda
      _count: { comments: 0 }
    };

    setPosts(prevPosts => [newPostWithAuthor, ...prevPosts]);
    // Se o "The Right Now" estiver vazio ou o novo post for mais recente
    if (!rightNowPost || new Date(newPostWithAuthor.createdAt) > new Date(rightNowPost.createdAt)) {
        setRightNowPost(newPostWithAuthor);
    }
  }, [user, rightNowPost]);

  const handlePostDeleted = useCallback((deletedPostId: number) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPostId));
    if (rightNowPost?.id === deletedPostId) {
        fetchPosts(true); // Buscar um novo "The Right Now" post
    }
  }, [rightNowPost, fetchPosts]);

  const handleCommentAddedToPost = useCallback((postId: number, newComment: Comment) => {
    const mapPost = (post: Post) => {
        if (post.id === postId) {
            return {
                ...post,
                comments: [newComment, ...(post.comments || [])],
                _count: { comments: (post._count?.comments || 0) + 1 },
            };
        }