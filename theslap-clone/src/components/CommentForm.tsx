// src/components/CommentForm.tsx
'use client';
import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client';
import { Comment } from '@/app/(main)/page'; // Reutilizando a interface Comment

interface CommentFormProps {
  postId: number;
  onCommentCreated: (newComment: Comment) => void;
}

export default function CommentForm({ postId, onCommentCreated }: CommentFormProps) {
  const { user } = useUser();
  const [textContent, setTextContent] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFilesToUpload, setImageFilesToUpload] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 2);
      setImageFilesToUpload(filesArray);

      const base64Promises = filesArray.map(file =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        })
      );
      Promise.all(base64Promises)
        .then(setImagePreviews)
        .catch(() => setError("Erro ao processar imagens."));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Você precisa estar logado para comentar.");
      return;
    }
    if (!textContent.trim() && imageFilesToUpload.length === 0) {
      setError('Escreva algo ou adicione uma imagem ao seu comentário!');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    let uploadedImageUrls: (string | null)[] = [null, null];
    try {
      for (let i = 0; i < imageFilesToUpload.length; i++) {
        const imageBase64 = imagePreviews[i];
        if (imageBase64) {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 }),
          });
          if (!uploadRes.ok) throw new Error(`Falha no upload da imagem ${i + 1}.`);
          const imgData = await uploadRes.json();
          uploadedImageUrls[i] = imgData.imageUrl;
        }
      }

      const commentPayload = {
        textContent: textContent.trim(),
        imageUrl1: uploadedImageUrls[0],
        imageUrl2: uploadedImageUrls[1],
      };

      const commentRes = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentPayload),
      });

      if (!commentRes.ok) {
        const errData = await commentRes.json();
        throw new Error(errData.error || 'Falha ao enviar comentário.');
      }

      const newComment: Comment = await commentRes.json();
      onCommentCreated(newComment);

      setTextContent('');
      setImagePreviews([]);
      setImageFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <p style={{fontSize: '0.9em', color: 'gray', textAlign: 'center', padding: '10px'}}>Faça login para deixar um comentário.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        placeholder="Adicione um comentário..."
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        rows={2}
        maxLength={300}
        disabled={isSubmitting}
      />
      <div>
        <label htmlFor={`commentImageUpload-${postId}`} style={{display: 'block', marginBottom: '5px', fontSize: '0.8em', color: '#666'}}>Adicionar Imagens (opcional, até 2):</label>
        <input
            id={`commentImageUpload-${postId}`} // ID único para cada form
            type="file"
            multiple
            accept="image/png, image/jpeg, image/gif"
            onChange={handleImageChange}
            disabled={isSubmitting}
            ref={fileInputRef}
            style={{fontSize: '0.9em'}}
        />
      </div>
      {imagePreviews.length > 0 && (
        <div className="image-previews" style={{gap: '5px'}}>
          {imagePreviews.map((src, idx) => (
            <Image key={idx} src={src} alt={`Preview ${idx + 1}`} width={60} height={60} />
          ))}
        </div>
      )}
      {error && <p className="error-message" style={{fontSize: '0.9em', margin: '5px 0'}}>{error}</p>}
      <button type="submit" disabled={isSubmitting} style={{padding: '8px 12px', fontSize: '0.9em', alignSelf: 'flex-start'}}>
        {isSubmitting ? 'Enviando...' : 'Comentar'}
      </button>
    </form>
  );
}