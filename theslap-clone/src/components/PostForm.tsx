// src/components/PostForm.tsx
'use client';
import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client'; // Para obter dados do usuário logado

// Reutilize a interface Post da HomePage ou defina uma específica se necessário
// import { Post } from '@/app/(main)/page'; // Se exportada da HomePage

interface PostFormProps {
  onPostCreated: (newPost: any) // Idealmente, use o tipo Post aqui
    => void;
}

const moodOptions = [
  { label: 'Selecione seu humor...', value: '' },
  { label: '😃 Feliz', value: 'Feliz 😃' },
  { label: '😡 Com Raiva', value: 'Com Raiva 😡' },
  { label: '😢 Triste', value: 'Triste 😢' },
  { label: '🤔 Pensativo', value: 'Pensativo 🤔' },
  { label: '🥳 Animado', value: 'Animado 🥳' },
  { label: '😴 Com Sono', value: 'Com Sono 😴' },
  { label: '🤩 Empolgado', value: 'Empolgado 🤩' },
  { label: '🤪 Maluco', value: 'Maluco 🤪' },
  { label: 'Outro (personalizado)', value: 'custom' },
];

export default function PostForm({ onPostCreated }: PostFormProps) {
  const { user } = useUser(); // Para associar o post ao usuário
  const [textContent, setTextContent] = useState('');
  const [selectedMood, setSelectedMood] = useState(''); // Humor do select
  const [customMood, setCustomMood] = useState(''); // Humor personalizado
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // Armazena URLs base64 para preview
  const [imageFilesToUpload, setImageFilesToUpload] = useState<File[]>([]); // Armazena os arquivos para upload
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 2); // Limita a 2 imagens
      setImageFilesToUpload(filesArray); // Armazena os arquivos originais

      const base64Promises = filesArray.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      });

      Promise.all(base64Promises)
        .then(base64Images => setImagePreviews(base64Images))
        .catch(err => {
          console.error("Erro ao ler arquivos de imagem:", err);
          setError("Erro ao processar imagens. Tente novamente.");
        });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Você precisa estar logado para postar.");
      return;
    }
    if (!textContent.trim() && imageFilesToUpload.length === 0) {
      setError('Escreva algo ou adicione pelo menos uma imagem!');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    let uploadedImageUrls: (string | null)[] = [null, null];

    try {
      // 1. Fazer upload das imagens para o Imgur (via nossa API de upload)
      for (let i = 0; i < imageFilesToUpload.length; i++) {
        // Precisamos enviar a imagem como base64 para a API de upload
        const imageBase64 = imagePreviews[i]; // Usamos os previews que já são base64
        if (imageBase64) {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64 }),
          });
          if (!uploadResponse.ok) {
            const errData = await uploadResponse.json();
            throw new Error(errData.error || `Falha no upload da imagem ${i + 1}.`);
          }
          const imageData = await uploadResponse.json();
          uploadedImageUrls[i] = imageData.imageUrl;
        }
      }

      // 2. Criar o post com os URLs das imagens e outros dados
      const finalMood = selectedMood === 'custom' ? customMood.trim() : selectedMood;

      const postPayload = {
        textContent: textContent.trim(),
        mood: finalMood || null, // Envia null se não houver humor
        imageUrl1: uploadedImageUrls[0],
        imageUrl2: uploadedImageUrls[1],
        // userId será pego da sessão no backend
      };

      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postPayload),
      });

      if (!postResponse.ok) {
        const errData = await postResponse.json();
        throw new Error(errData.error || 'Falha ao criar post. Tente novamente.');
      }

      const newPost = await postResponse.json();
      onPostCreated(newPost); // Chama o callback para atualizar a UI

      // Limpar formulário
      setTextContent('');
      setSelectedMood('');
      setCustomMood('');
      setImagePreviews([]);
      setImageFilesToUpload([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Limpa o input de arquivo
      }

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro desconhecido.");
      console.error("Erro ao submeter post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="post-form">
      <textarea
        placeholder="O que está na sua mente, estrela?"
        value={textContent}
        onChange={(e) => setTextContent(e.target.value)}
        rows={4}
        maxLength={500} // Limite opcional de caracteres
        disabled={isSubmitting}
      />
      <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center'}}>
        <div style={{flex: '1 1 200px'}}> {/* Flex para responsividade */}
            <label htmlFor="moodSelect" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#555'}}>Humor Atual:</label>
            <select
                id="moodSelect"
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                disabled={isSubmitting}
            >
                {moodOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
        {selectedMood === 'custom' && (
            <div style={{flex: '1 1 200px'}}>
                <label htmlFor="customMoodInput" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#555'}}>Humor Personalizado:</label>
                <input
                    id="customMoodInput"
                    type="text"
                    placeholder="Ex: Comemorando! 🎉"
                    value={customMood}
                    onChange={(e) => setCustomMood(e.target.value)}
                    disabled={isSubmitting}
                    maxLength={50}
                />
            </div>
        )}
      </div>
      <div>
        <label htmlFor="imageUpload" style={{display: 'block', marginBottom: '5px', fontSize: '0.9em', color: '#555'}}>Adicionar Imagens (até 2):</label>
        <input
            id="imageUpload"
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
        <div className="image-previews">
          {imagePreviews.map((imgSrc, index) => (
            <Image key={index} src={imgSrc} alt={`Preview ${index + 1}`} width={100} height={100} />
          ))}
        </div>
      )}
      {error && <p className="error-message">{error}</p>}
      <button type="submit" disabled={isSubmitting || !user}>
        {isSubmitting ? 'Publicando...' : 'Publicar no TheSlap!'}
      </button>
      {!user && <p style={{fontSize: '0.8em', color: 'gray', textAlign: 'center'}}>Você precisa estar logado para postar.</p>}
    </form>
  );
}