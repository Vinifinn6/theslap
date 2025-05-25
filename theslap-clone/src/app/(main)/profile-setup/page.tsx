// src/app/(main)/profile-setup/page.tsx
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';

interface UserProfileData {
  id: string; // Auth0 ID
  username: string;
  name?: string | null;
  profileImageUrl?: string | null;
}

export default function ProfileSetupPage() {
  const { user, error: authError, isLoading: authLoading } = useUser();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfileData | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Buscar perfil existente para preencher o formulário
  useEffect(() => {
    if (user && user.sub) {
      setIsLoading(true);
      fetch(`/api/users?auth0Id=${user.sub}`)
        .then(res => {
          if (res.ok) return res.json();
          if (res.status === 404) return null; // Usuário não encontrado, normal para setup
          throw new Error("Falha ao buscar dados do perfil existente.");
        })
        .then((data: UserProfileData | null) => {
          if (data) {
            setCurrentProfile(data);
            setUsername(data.username || '');
            setName(data.name || user.name || ''); // Prefere nome do BD, senão do Auth0
            setProfileImagePreview(data.profileImageUrl || user.picture || null); // Prefere imagem do BD
          } else {
            // Se não há perfil no BD, usa dados do Auth0 como ponto de partida
            setName(user.name || user.nickname || '');
            setProfileImagePreview(user.picture || null);
            // O username pode ser sugerido, mas o usuário deve confirmar/alterar
            let suggestedUsername = (user.nickname || user.name?.split(' ')[0] || 'usuario').toLowerCase().replace(/[^a-z0-9]/gi, '');
            setUsername(suggestedUsername);

          }
        })
        .catch(err => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !user.sub) {
      setError("Sessão de usuário não encontrada. Faça login novamente.");
      return;
    }
    if (!username.trim()) {
      setError("O nome de usuário (@username) é obrigatório.");
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        setError("Username deve ter entre 3-20 caracteres e conter apenas letras, números e underscores (_).");
        return;
    }


    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    let uploadedImageUrl = currentProfile?.profileImageUrl || user.picture; // Mantém a imagem atual se nenhuma nova for enviada

    try {
      // 1. Se uma nova imagem de perfil foi selecionada, faz o upload
      if (profileImageFile && profileImagePreview) {
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: profileImagePreview }),
        });
        if (!uploadResponse.ok) {
          const errData = await uploadResponse.json();
          throw new Error(errData.error || "Falha no upload da imagem de perfil.");
        }
        const imageData = await uploadResponse.json();
        uploadedImageUrl = imageData.imageUrl;
      }

      // 2. Envia os dados do perfil para a API de usuários
      // A API /api/users (POST) deve lidar com 'upsert' (criar se não existir, atualizar se existir)
      // e verificar a unicidade do username.
      const profileData = {
        auth0Id: user.sub, // Importante para identificar o usuário no backend
        username: username.trim().toLowerCase(), // Armazenar em minúsculas
        name: name.trim() || null,
        profileImageUrl: uploadedImageUrl,
        // Adicione outros campos do perfil aqui se necessário
      };

      const response = await fetch('/api/users', { // Rota POST para criar/atualizar usuário
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao salvar o perfil.");
      }

      const updatedProfile: UserProfileData = await response.json();
      setSuccessMessage("Perfil salvo com sucesso! Redirecionando...");
      setCurrentProfile(updatedProfile); // Atualiza o estado local com o perfil salvo

      // Redirecionar para a página de perfil do usuário ou para a home
      setTimeout(() => {
        router.push(`/@${updatedProfile.username}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao salvar perfil:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (user && isLoading)) {
    return <div className="loading-message container">Carregando configuração de perfil...</div>;
  }

  if (authError) {
    return <div className="error-message container">Erro de autenticação: {authError.message}</div>;
  }

  if (!user) {
    // Isso não deveria acontecer se a página for protegida ou o usuário for redirecionado para login
    router.push("/api/auth/login"); // Redireciona para login se não houver usuário
    return <div className="loading-message container">Redirecionando para login...</div>;
  }


  return (
    <div className="container" style={{maxWidth: '600px', margin: '30px auto'}}>
      <h1 style={{textAlign: 'center', color: '#0a1832'}}>Configure seu Perfil TheSlap!</h1>
      <p style={{textAlign: 'center', color: '#555', marginBottom: '25px'}}>
        Escolha seu @username exclusivo e mostre sua cara (ou um avatar legal!).
      </p>

      <form onSubmit={handleSubmit} className="post-form" style={{borderColor: '#0a1832'}}>
        {profileImagePreview && (
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <Image
              src={profileImagePreview}
              alt="Preview do Perfil"
              width={120}
              height={120}
              style={{ borderRadius: '50%', border: '3px solid #ff8c00', objectFit: 'cover' }}
            />
          </div>
        )}
        <div>
          <label htmlFor="profileImage" style={{display: 'block', marginBottom: '5px', fontWeight:'bold'}}>Foto de Perfil:</label>
          <input
            type="file"
            id="profileImage"
            accept="image/png, image/jpeg, image/gif"
            onChange={handleImageChange}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="username" style={{display: 'block', marginBottom: '5px', fontWeight:'bold'}}>@Username (apelido único):</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/gi, ''))}
            placeholder="Ex: astro_da_guitarra"
            required
            minLength={3}
            maxLength={20}
            disabled={isLoading}
            style={{fontFamily: 'monospace'}}
          />
          <small style={{color: '#555'}}>Apenas letras, números e underscore (_). 3-20 caracteres.</small>
        </div>

        <div>
          <label htmlFor="name" style={{display: 'block', marginBottom: '5px', fontWeight:'bold'}}>Nome (como você quer ser chamado):</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Tori Vega"
            maxLength={50}
            disabled={isLoading}
          />
        </div>

        {/* Adicionar outros campos do perfil aqui se desejar, ex: bio, etc. */}

        {error && <p className="error-message">{error}</p>}
        {successMessage && <p style={{color: 'green', textAlign: 'center', fontWeight: 'bold'}}>{successMessage}</p>}

        <button type="submit" disabled={isLoading || !username.trim()} style={{marginTop: '10px'}}>
          {isLoading ? 'Salvando...' : (currentProfile?.username ? 'Atualizar Perfil' : 'Salvar e Entrar no TheSlap!')}
        </button>
      </form>
    </div>
  );
}