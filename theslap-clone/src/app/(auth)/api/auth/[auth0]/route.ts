// src/app/(auth)/api/auth/[auth0]/route.ts
import { handleAuth, handleCallback, HandleLoginOptions } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma'; // Importe o Prisma Client

// Opções de login para redirecionar após o login e criar/atualizar usuário no BD
const loginOptions: HandleLoginOptions = {
  returnTo: "/profile-setup", // Redireciona para configurar o perfil após o login
  authorizationParams: {
    audience: process.env.AUTH0_API_AUDIENCE, // Opcional, se você estiver solicitando um token de acesso para sua API
    // scope: 'openid profile email offline_access', // Adicione escopos conforme necessário
  },
};

// Manipulador de callback para criar/atualizar usuário no banco de dados após o login
const afterCallback = async (req: NextRequest, session: any, state: any) => {
  if (session.user && session.user.sub) {
    const auth0User = session.user;
    try {
      // Verifica se o usuário já existe pelo ID do Auth0
      let user = await prisma.user.findUnique({
        where: { id: auth0User.sub },
      });

      if (!user) {
        // Se o usuário não existe, cria um novo com dados básicos do Auth0.
        // O username será definido na página /profile-setup.
        // Um username temporário ou nulo pode ser usado aqui.
        // Para evitar conflitos de username único, podemos deixar em branco
        // e obrigar o usuário a definir em /profile-setup.
        // Um username padrão poderia ser o nickname do Auth0 ou parte do email,
        // mas isso pode causar conflitos se não for único.
        // A melhor abordagem é ter um fluxo de onboarding (profile-setup).

        // Tentativa de username inicial (será verificado/alterado no profile-setup)
        let initialUsername = (auth0User.nickname || auth0User.name?.split(' ')[0] || 'user' + Date.now()).toLowerCase().replace(/[^a-z0-9]/gi, '');

        // Verifica se esse username inicial já existe
        const existingByInitialUsername = await prisma.user.findUnique({ where: { username: initialUsername }});
        if (existingByInitialUsername) {
            initialUsername = `${initialUsername}${Date.now().toString().slice(-4)}`; // Adiciona sufixo para tornar único
        }

        user = await prisma.user.create({
          data: {
            id: auth0User.sub,
            username: initialUsername, // Este username será provisório até o setup
            name: auth0User.name || auth0User.nickname || 'Novo Usuário',
            profileImageUrl: auth0User.picture,
            // Deixe o campo 'mood' para ser definido pelo usuário mais tarde
          },
        });
        console.log(`Usuário criado no BD: ${user.username}`);
      } else {
        // Se o usuário já existe, podemos opcionalmente atualizar alguns dados
        // como nome ou foto de perfil se eles mudaram no Auth0.
        // Mas vamos manter simples por enquanto, focando na criação.
        console.log(`Usuário já existe no BD: ${user.username}`);
      }
    } catch (error) {
      console.error('Erro ao criar/verificar usuário no BD após callback do Auth0:', error);
      // Não interrompa o fluxo de login por causa disso, mas registre o erro.
    }
  }
  return session; // Retorna a sessão para continuar o fluxo
};


export const GET = handleAuth({
  login: handleCallback(loginOptions), // Usar handleCallback para loginOptions
  callback: handleCallback({ afterCallback }), // Aplicar afterCallback aqui
  // Você pode adicionar manipuladores para outras sub-rotas como logout, etc.
});