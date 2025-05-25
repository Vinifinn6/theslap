// src/components/CommentCard.tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Comment, Author } from '@/app/(main)/page'; // Reutilizando interfaces

interface CommentCardProps {
  comment: Comment;
  currentUserId?: string | null;
  onDeleteSuccess?: (commentId: number) => void; // Opcional, se implementar exclusão
}

export default function CommentCard({ comment, currentUserId, onDeleteSuccess }: CommentCardProps) {
  const isAuthor = comment.userId === currentUserId;

  const handleDelete = async () => {
    // Implementar lógica de exclusão se necessário
    // Ex: /api/comments/[commentId] (precisaria criar esta API route)
    if (!onDeleteSuccess) return;
    if (confirm("Tem certeza que quer excluir este comentário?")) {
      // const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' });
      // if (res.ok) {
      //   onDeleteSuccess(comment.id);
      // } else {
      //   alert("Falha ao excluir comentário.");
      // }
      alert("Funcionalidade de exclusão de comentário ainda não implementada no backend.");
    }
  };

  return (
    <div className="comment-card card"> {/* Reutiliza a classe 'card' com modificações via 'comment-card' */}
      <div className="card-header">
        {comment.user.profileImageUrl ? (
          <Link href={`/@${comment.user.username}`}>
            <Image src={comment.user.profileImageUrl} alt={comment.user.username} width={30} height={30} />
          </Link>
        ) : (
          <div style={{width:30, height:30, backgroundColor:'#ccc', borderRadius:'50%', marginRight:10}} /> // Placeholder
        )}
        <div>
          <Link href={`/@${comment.user.username}`} className="username">
            @{comment.user.username}
          </Link>
          {comment.user.name && <span className="name" style={{fontSize: '0.85em'}}>({comment.user.name})</span>}
        </div>
        <span className="timestamp" style={{fontSize: '0.75em'}}>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
      <div className="card-content">
        <p>{comment.textContent}</p>
        {(comment.imageUrl1 || comment.imageUrl2) && (
          <div className="card-images" style={{marginTop: '8px'}}>
            {comment.imageUrl1 && <Image src={comment.imageUrl1} alt="Imagem do comentário 1" width={100} height={100} />}
            {comment.imageUrl2 && <Image src={comment.imageUrl2} alt="Imagem do comentário 2" width={100} height={100} />}
          </div>
        )}
      </div>
      {isAuthor && onDeleteSuccess && ( // Mostrar botão de excluir se for o autor e a função for passada
        <div className="card-actions" style={{paddingTop: '5px', marginTop: '8px'}}>
          <button onClick={handleDelete} className="delete-button" style={{fontSize: '0.8em'}}>Excluir</button>
        </div>
      )}
    </div>
  );
}