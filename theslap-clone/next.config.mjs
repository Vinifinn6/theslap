/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.imgur.com', // Para permitir imagens do Imgur
      },
      {
        protocol: 'https',
        hostname: 's.gravatar.com', // Para imagens de perfil padrão do Auth0
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Para fotos de perfil do Google vindas do Auth0
      },
      // Adicione outros hostnames se suas fotos de perfil vierem de outros provedores via Auth0
    ],
  },
};

export default nextConfig;