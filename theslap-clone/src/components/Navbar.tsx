// src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface UserProfileData {
  id: string;
  username: string;
  name?: string | null;
  profileImageUrl?: string | null;
}

const Navbar = () => {
  const { user, isLoading: authLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname(); // Para verificar se já está na página de profile-setup

  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (user && user.sub) {
      setProfileLoading(true);
      fetch(`/api/users?auth0Id=${user.sub}`) // Endpoint para buscar usuário pelo Auth0 ID
        .then(res => {
          if (!res.ok) {
            // Se não encontrar, pode ser um novo usuário que precisa de setup
            if (res.status === 404 && pathname !== '/profile-setup') {
              // O callback do Auth0 já deve ter criado um usuário básico.
              // Se o /profile-setup for acessado, ele cuidará de buscar ou permitir a criação do username.
              // console.warn("Usuário não encontrado por auth0Id, redirecionando para setup ou aguardando criação.");
            }
            return null; // Continuar para não travar o setUserProfile(null)
          }
          return res.json();
        })
        .then(data => {
          if (isMounted) {
            setUserProfile(data);
          }
        })
        .catch(error => {
          console.error("Erro ao buscar perfil do usuário para navbar:", error);
          if (isMounted) setUserProfile(null); // Define como nulo em caso de erro
        })
        .finally(() => {
          if (isMounted) setProfileLoading(false);
        });
    } else if (!authLoading && !user) {
        // Se não há usuário e autenticação não está carregando, não há perfil a buscar
        setProfileLoading(false);
        setUserProfile(null);
    }
    return () => { isMounted = false; };
  }, [user, authLoading, pathname]);


  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm(''); // Limpar busca após submeter
    }
  };

  // Determinar o link do perfil e o nome a ser exibido
  let profileLink = "/profile-setup";
  let profileDisplay: React.ReactNode = "Configurar Perfil";
  let profileImage = user?.picture; // Imagem padrão do Auth0

  if (!authLoading && user) { // Apenas se o usuário estiver logado
    if (!profileLoading && userProfile && userProfile.username) {
      profileLink = `/@${userProfile.username}`;
      profileDisplay = `@${userProfile.username}`;
      if(userProfile.profileImageUrl) profileImage = userProfile.profileImageUrl;
    } else if (profileLoading) {
      profileDisplay = "Carregando...";
    } else if (!userProfile && pathname !== '/profile-setup') {
      // Usuário logado mas sem perfil na nossa DB (ou erro ao buscar) e não está no setup
      // O redirect para /profile-setup no callback do Auth0 deve cuidar disso
      // Se, por algum motivo, o usuário está logado e sem perfil aqui,
      // o link "Configurar Perfil" é apropriado.
    }
  }


  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="TheSlapClone Logo"
            width={150} // Ajuste conforme o tamanho real do seu logo
            height={50} // Ajuste conforme o tamanho real do seu logo
            priority // Carregar o logo com prioridade
          />
        </Link>
      </div>

      {user && ( // Mostrar busca apenas se logado
        <form onSubmit={handleSearchSubmit} style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
          <input
            type="text"
            placeholder="Buscar usuários ou posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px', color: '#333' }}
          />
          <button type="submit" style={{padding: '8px 10px', backgroundColor: '#ff8c00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>GO</button>
        </form>
      )}

      <div className="navbar-links">
        {authLoading && <span style={{fontSize: '0.9em'}}>Carregando...</span>}
        {!authLoading && user && (
          <>
            <Link href="/">Home</Link>
            <Link href={profileLink}>
                {profileImage && (
                    <Image
                        src={profileImage}
                        alt="Perfil"
                        width={30}
                        height={30}
                        style={{borderRadius: '50%', marginRight: '5px', border: '1px solid #fff'}}
                    />
                )}
                {profileDisplay}
            </Link>
            <Link href="/messages">Mensagens</Link>
            <a href="/api/auth/logout">Sair</a>
          </>
        )}
        {!authLoading && !user && (
          <a href="/api/auth/login">Login / Cadastro</a>
        )}
      </div>
    </nav>
  );
};

export default Navbar;