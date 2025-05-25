// src/components/PostCard.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Post, Comment, Author } from '@/app/(main)/page'; // Reutilizando interfaces da HomePage
import CommentForm from './CommentForm';
import CommentCard from './CommentCard';
import { useUser } from '@auth0/nextjs-auth0/client';


interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  onDeleteSuccess?: (postId: number) => void;
  onCommentCreated: (postId: number, newComment: Comment) => void; // Callback para atualizar o estado global de posts/comentários
}

export default function PostCard({ post: initialPost, currentUserId, onDeleteSuccess, onCommentCreated }: PostCardProps) {
  const { user: loggedInUser } = useUser(); // Para passar para o CommentForm e CommentCard
  const [post, setPost] = useState<Post>(initialPost); // Estado local para o post, incluindo comentários
  const [showComments, setShowComments] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualiza o estado do post se a prop initialPost mudar (ex: ao deletar/adicionar comentários externamente)
  useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const isAuthor = post.userId === currentUserId;

  const handleDelete = async () => {
    if (!confirm('Tem certeza que quer apagar este post? Esta ação é irreversível!')) return;
    setError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDeleteSuccess) onDeleteSuccess(post.id);
        // O post será removido da lista na HomePage
      } else {
        const errData = await res.json();
        setError(errData.error || 'Falha ao excluir post.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao tentar excluir post.');
      console.error(err);
    }
  };

  const fetchCommentsRealtime = useCallback(async () => {
    if (!post.id) return; // Sem ID do post, não pode buscar comentários
    setIsLoadingComments(true);
    setError(null);
    try {
      // A rota GET /api/posts/[postId] já inclui os comentários
      const res = await fetch(`/api/posts/${post.id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao buscar comentários atualizados.");
      }
      const updatedPostData: Post = await res.json();
      setPost(prevPost => ({
        ...prevPost,
        comments: updatedPostData.comments || [],
        _count: { comments: updatedPostData.comments?.length || 0 }
      }));
    } catch (e: any) {
      console.error("Erro ao buscar comentários:", e);
      setError(e.message);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id]);


  const toggleComments = () => {
    const newShowState = !showComments;
    setShowComments(newShowState);
    // Se está abrindo os comentários e eles não foram carregados (ou para garantir que estão atualizados)
    if (newShowState && (!post.comments || post.comments.length === 0 || post.comments.length !== post._count?.comments)) {
      fetchCommentsRealtime();
    }
  };

  // Callback para quando um novo comentário é criado através do CommentForm
  const handleLocalCommentCreated = (newComment: Comment) => {
    // Atualiza o estado local do post para incluir o novo comentário
    setPost(prevPost => {
        const updatedComments = [newComment, ...(prevPost.comments || [])];
        return {
            ...prevPost,
            comments: updatedComments,
            _count: { comments: updatedComments.length }
        };
    });
    // Chama o callback passado pela HomePage para atualizar o estado global (se necessário)
    onCommentCreated(post.id, newComment);
  };

  // Opcional: Função para exclusão de comentário (precisaria de API e lógica no CommentCard)
  const handleCommentDeleted = (deletedCommentId: number) => {
    setPost(prevPost => {
        const updatedComments = (prevPost.comments