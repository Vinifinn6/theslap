// src/components/UserAvatar.tsx
import Image from 'next/image';
import Link from 'next/link';

interface UserAvatarProps {
  username?: string | null;
  profileImageUrl?: string | null;
  size?: number; // Tamanho em pixels
  linkToProfile?: boolean; // Se o avatar deve ser um link para o perfil
  className?: string;
}

export default function UserAvatar({
  username,
  profileImageUrl,
  size = 40,
  linkToProfile = false,
  className = '',
}: UserAvatarProps) {
  const initials = username ? username.charAt(0).toUpperCase() : '?';

  const avatarContent = (
    <div
      className={`user-avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#ccc', // Cor de fallback se não houver imagem
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden', // Para garantir que a imagem fique redonda
        border: profileImageUrl ? '2px solid #ff8c00' : '2px solid #aaa', // Borda sutil
        fontSize: `${size * 0.5}px`, // Tamanho da fonte proporcional ao tamanho do avatar
        color: '#fff', // Cor do texto para as iniciais
        fontWeight: 'bold',
        cursor: linkToProfile && username ? 'pointer' : 'default',
      }}
      title={username || 'Avatar'}
    >
      {profileImageUrl ? (
        <Image
          src={profileImageUrl}
          alt={username || 'Avatar do usuário'}
          width={size}
          height={size}
          style={{ objectFit: 'cover' }} // Garante que a imagem cubra o espaço
        />
      ) : (
        initials
      )}
    </div>
  );

  if (linkToProfile && username) {
    return <Link href={`/@${username.toLowerCase()}`}>{avatarContent}</Link>;
  }

  return avatarContent;
}