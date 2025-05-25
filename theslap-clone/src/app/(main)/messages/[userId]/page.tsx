// src/app/(main)/messages/[userId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, FormEvent, useCallback } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import UserAvatar from '@/components/UserAvatar';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface Message {
  id: number;
  senderId: string;
  receiverId: string;
  textContent?: string | null;
  imageUrl1?: string | null;
  imageUrl2?: string | null;
  createdAt: string;
  sender: { // Informações do remetente
    username: string;
    name?: string | null;
    profileImageUrl?: string | null;
  };
}

interface OtherUser {
    id: string;
    username: string;
    name?: string | null;
    profileImageUrl?: string | null;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const otherUserId = params.userId as string;
  const { user: loggedInUser, isLoading: authLoading } = useUser();

  const [otherUserInfo, setOtherUserInfo] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageFilesToUpload, setImageFilesToUpload] = useState<File[]>([]);

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null); // Para scrollar para a última mensagem
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Buscar informações do outro usuário
  const fetchOtherUserInfo = useCallback(async () => {
    if (!otherUserId) return;
    try {
        const res = await fetch(`/api/users?id=${otherUserId}`); // API para buscar usuário por ID (Auth0 ID)
        if(!res.ok) {
            if(res.status === 404) throw new Error("Usuário da conversa não encontrado.");
            throw new Error("Falha ao buscar informações do usuário.");
        }
        const data = await res.json();
        setOtherUserInfo(data);
    } catch (err: any) {
        setError(err.message);
        console.error(err);
    }
  }, [otherUserId]);


  // Buscar mensagens da conversa
  const fetchMessages = useCallback(async () => {
    if (!loggedInUser || !otherUserId) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${otherUserId}`); // API que busca mensagens entre loggedInUser e otherUserId
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao carregar mensagens.");
      }
      const data: Message[] = await res.json();
      setMessages(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao buscar mensagens:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, [loggedInUser, otherUserId]);

  useEffect(() => {
    fetchOtherUserInfo();
    fetchMessages();
    // Configurar um intervalo para buscar novas mensagens (polling simples)
    const intervalId = setInterval(fetchMessages, 15000); // A cada 15 segundos
    return () => clearInterval(intervalId); // Limpar o intervalo ao desmontar
  }, [fetchOtherUserInfo, fetchMessages]);

  useEffect(scrollToBottom, [messages]); // Scrollar quando novas mensagens chegam

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      Promise.all(base64Promises).then(setImagePreviews).catch(() => setError("Erro ao processar imagens."));
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!loggedInUser || (!newMessageText.trim() && imageFilesToUpload.length === 0)) return;

    setSendingMessage(true);
    setError(null);
    let uploadedImageUrls: (string | null)[] = [null, null];

    try {
      for (let i = 0; i < imageFilesToUpload.length; i++) {
        const imageBase64 = imagePreviews[i];
        if (imageBase64) {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64 }),
          });
          if (!uploadRes.ok) throw new Error(`Falha no upload da imagem ${i + 1}.`);
          const imgData = await uploadRes.json();
          uploadedImageUrls[i] = imgData.imageUrl;
        }
      }

      const payload = {
        receiverId: otherUserId,
        textContent: newMessageText.trim(),
        imageUrl1: uploadedImageUrls[0],
        imageUrl2: uploadedImageUrls[1],
      };

      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao enviar mensagem.");
      }
      // const newMessageData = await res.json(); // A API retorna a nova mensagem
      // setMessages(prev => [...prev, newMessageData]); // Adiciona otimisticamente (ou refetch)
      fetchMessages(); // Refetch para pegar a mensagem confirmada do servidor
      setNewMessageText('');
      setImagePreviews([]);
      setImageFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao enviar mensagem:", err);
    } finally {
      setSendingMessage(false);
    }
  };


  if (authLoading) return <div className="loading-message container" style={{color: 'white'}}>Carregando...</div>;
  if (!loggedInUser) { router.push('/api/auth/login'); return null; } // Redireciona se não logado

  return (
    <div className="chat-page-container" style={{height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.1)'}}>
      <header style={{ padding: '10px 15px', backgroundColor: 'rgba(10, 24, 50, 0.9)', color: 'white', display: 'flex', alignItems: 'center', borderBottom: '1px solid #ff8c00'}}>
        {otherUserInfo ? (
            <>
                <UserAvatar username={otherUserInfo.username} profileImageUrl={otherUserInfo.profileImageUrl} size={40} />
                <Link href={`/@${otherUserInfo.username}`} style={{marginLeft: '10px', fontWeight: 'bold', fontSize: '1.1em', color: 'white', textDecoration: 'none'}}>
                    {otherUserInfo.name || `@${otherUserInfo.username}`}
                </Link>
            </>
        ) : (
            <span style={{fontWeight: 'bold', fontSize: '1.1em'}}>Carregando info do chat...</span>
        )}
      </header>

      <div className="chat-messages">
        {loadingMessages && <p className="loading-message" style={{color: 'lightgray'}}>Carregando mensagens...</p>}
        {error && <p className="error-message">{error}</p>}
        {!loadingMessages && messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-message ${msg.senderId === loggedInUser.sub ? 'sent' : 'received'}`}
          >
            {msg.senderId !== loggedInUser.sub && otherUserInfo && ( // Mini avatar para mensagens recebidas
                <UserAvatar username={otherUserInfo.username} profileImageUrl={otherUserInfo.profileImageUrl} size={20} />
            )}
            <div className="message-content" style={{display: 'inline-block', padding: '8px 12px', borderRadius:'10px', backgroundColor: msg.senderId === loggedInUser.sub ? '#ffc107' : '#e9ecef', color: msg.senderId === loggedInUser.sub ? '#333' : '#333', maxWidth: '100%'}}>
                {msg.textContent && <p style={{margin:0, wordBreak: 'break-word'}}>{msg.textContent}</p>}
                {(msg.imageUrl1 || msg.imageUrl2) && (
                    <div className="message-images" style={{marginTop: msg.textContent ? '8px' : '0', display: 'flex', flexDirection:'column', gap: '5px'}}>
                    {msg.imageUrl1 && <Image src={msg.imageUrl1} alt="Imagem da mensagem" width={150} height={150} style={{objectFit:'cover', borderRadius:'4px'}} />}
                    {msg.imageUrl2 && <Image src={msg.imageUrl2} alt="Imagem da mensagem" width={150} height={150} style={{objectFit:'cover', borderRadius:'4px'}} />}
                    </div>
                )}
                <div className="chat-message-meta" style={{fontSize:'0.7em', marginTop: '4px', textAlign: msg.senderId === loggedInUser.sub ? 'right' : 'left', color: '#555'}}>
                    {format(new Date(msg.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* Elemento para scrollar até o fim */}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessageText}
          onChange={(e) => setNewMessageText(e.target.value)}
          placeholder="Digite sua mensagem..."
          disabled={sendingMessage}
        />
        <input
          type="file"
          id="chatImageUpload"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          style={{display: 'none'}} // Esconder input, usar um botão para acionar
          disabled={sendingMessage}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sendingMessage} style={{padding: '10px'}}>📷</button>
        <button type="submit" disabled={sendingMessage || (!newMessageText.trim() && imageFilesToUpload.length === 0)}>
          {sendingMessage ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {imagePreviews.length > 0 && (
        <div className="image-previews" style={{padding: '5px 15px', backgroundColor: 'rgba(240,240,240,0.9)', display:'flex', gap:'5px'}}>
          {imagePreviews.map((src, idx) => <Image key={idx} src={src} alt={`Preview ${idx}`} width={40} height={40} style={{objectFit:'cover', borderRadius:'4px'}}/>)}
        </div>
      )}
    </div>
  );
}