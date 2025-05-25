// src/app/(main)/@[username]/layout.tsx
'use client';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import UserAvatar from '@/components/UserAvatar'; // Usando o novo componente

// Reutilize ou defina a interface do perfil
interface UserProfile {
  id: string; // Auth0 ID ou ID do seu banco
  username: string;
  name?: string | null;
  profileImageUrl?: string | null;
  // Adicione outros campos que seu perfil possa ter, como bio, data de criação, etc.
  // _count?: { posts: number; comments: number; followers: number; following: number };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname(); // Para destacar a aba ativa
  const usernameFromParams = params.username as string; // O Next.js garante que username é string aqui

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (usernameFromParams) {
      setLoading(true);
      setError(null);
      // A API /api/users deve ser capaz de buscar pelo username
      fetch(`/api/users?username=${usernameFromParams.toLowerCase()}`)
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({ error: `Usuário @${usernameFromParams} não encontrado ou erro na API.` }));
            throw new Error(errData.error || `Usuário @${usernameFromParams} não encontrado.`);
          }
          return res.json();
        })
        .then((data: UserProfile) => {
          setUserProfile(data);
        })
        .catch(err => {
          setError(err.message);
          console.error("Erro ao buscar perfil:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [usernameFromParams]);

  if (loading) return <div className="loading-message container" style={{color: 'white'}}>Carregando perfil de @{usernameFromParams}...</div>;
  if (error) return <div className="error-message container">{error}</div>;
  if (!userProfile) return <div className="error-message container">Perfil de @{usernameFromParams} não encontrado.</div>;

  return (
    <div className="profile-page-container"> {/* Um container geral para a página de perfil */}
      <header className="profile-header">
        <UserAvatar
            username={userProfile.username}
            profileImageUrl={userProfile.profileImageUrl}
            size={100}
            className="profile-header-avatar"
        />
        <div className="profile-info">
          <h1>{userProfile.name || `@${userProfile.username}`}</h1>
          <p className="username-display">@{userProfile.username}</p>
          {/* Adicionar mais informações do perfil aqui: bio, contagem de posts, etc. */}
          {/* Exemplo: <p className="profile-bio">Amante de música e artes!</p> */}
        </div>
        {/* Adicionar botão de Seguir/Editar Perfil aqui no futuro */}
      </header>
      <nav className="tabs">
        <Link href={`/@${userProfile.username}`} className={pathname === `/@${userProfile.username}` ? 'active' : ''}>
          Posts
        </Link>
        <Link href={`/@${userProfile.username}/replies`} className={pathname === `/@${userProfile.username}/replies` ? 'active' : ''}>
          Respostas
        </Link>
        {/* Outras abas como "Seguidores", "Seguindo" podem ser adicionadas aqui */}
      </nav>
      <div className="profile-content">
        {children} {/* Aqui serão renderizadas as page.tsx de posts ou replies */}
      </div>
    </div>
  );
}