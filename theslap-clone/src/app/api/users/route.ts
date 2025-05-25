// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// POST: Criar ou Atualizar perfil do usuário (usado pelo profile-setup e callback do Auth0)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const auth0IdFromSession = session.user.sub;

  try {
    const body = await req.json();
    const {
      auth0Id, // Pode vir do corpo da requisição (ex: profile-setup)
      username,
      name,
      profileImageUrl,
      // Outros campos do perfil podem ser adicionados aqui
    } = body;

    // O ID do Auth0 da sessão é o mestre, mas o corpo pode confirmar
    const targetAuth0Id = auth0IdFromSession || auth0Id;
    if (!targetAuth0Id) {
        return NextResponse.json({ error: 'ID do usuário (Auth0) não fornecido.' }, { status: 400 });
    }
    // Se o ID do corpo for diferente do da sessão (e ambos existirem), isso é um problema de segurança/lógica
    if (auth0Id && auth0IdFromSession && auth0Id !== auth0IdFromSession) {
        return NextResponse.json({ error: 'Conflito de IDs de usuário.' }, { status: 403 });
    }


    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ error: 'Nome de usuário inválido. Deve ter 3-20 caracteres (letras, números, _).' }, { status: 400 });
    }

    const usernameLower = username.toLowerCase();

    // Verificar se o username já está em uso por OUTRO usuário
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: usernameLower },
    });

    if (existingUserByUsername && existingUserByUsername.id !== targetAuth0Id) {
      return NextResponse.json({ error: 'Este @username já está em uso. Tente outro!' }, { status: 409 }); // 409 Conflict
    }

    const userData = {
      username: usernameLower,
      name: name || session.user.name || session.user.nickname || 'Usuário TheSlap',
      profileImageUrl: profileImageUrl || session.user.picture, // Usa a imagem fornecida ou a do Auth0 como fallback
    };

    // Upsert: cria se não existir (baseado no targetAuth0Id), ou atualiza se existir.
    const user = await prisma.user.upsert({
      where: { id: targetAuth0Id },
      update: userData,
      create: {
        id: targetAuth0Id,
        ...userData,
      },
    });

    return NextResponse.json(user, { status: 200 }); // 200 OK para update, 201 para create (upsert geralmente retorna 200)
  } catch (error: any) {
    console.error('Erro ao criar/atualizar usuário:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      // Este erro pode acontecer se houver uma condição de corrida, apesar da verificação acima.
      return NextResponse.json({ error: 'Este @username já está em uso (conflito P2002).' }, { status: 409 });
    }
    // Verifica se o erro é de parsing do JSON
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o perfil.' }, { status: 500 });
  }
}


// GET: Buscar usuários (por username, auth0Id, ou searchQuery)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username')?.toLowerCase();
  const auth0Id = searchParams.get('auth0Id');
  const userId = searchParams.get('id'); // Alias para auth0Id, usado na Navbar e ChatPage
  const searchQuery = searchParams.get('searchQuery');

  try {
    if (username) {
      const user = await prisma.user.findUnique({
        where: { username },
        // Se precisar de contagens ou relações, adicione 'include' aqui
        // include: { _count: { select: { posts: true, comments: true }}}
      });
      return user
        ? NextResponse.json(user, { status: 200 })
        : NextResponse.json({ error: `Usuário @${username} não encontrado.` }, { status: 404 });
    }

    if (auth0Id || userId) {
      const idToSearch = auth0Id || userId;
      const user = await prisma.user.findUnique({
        where: { id: idToSearch! }, // O '!' assume que idToSearch não será nulo aqui
      });
      return user
        ? NextResponse.json(user, { status: 200 })
        : NextResponse.json({ error: 'Usuário não encontrado pelo ID.' }, { status: 404 });
    }

    if (searchQuery) {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: searchQuery.toLowerCase(), mode: 'insensitive' } },
            { name: { contains: searchQuery, mode: 'insensitive' } }, // Busca no nome também
          ],
        },
        take: 10, // Limitar resultados da busca
        orderBy: { username: 'asc' }
      });
      return NextResponse.json(users, { status: 200 });
    }

    // Se nenhum parâmetro de busca específico for fornecido, pode retornar erro ou lista paginada (não implementado aqui)
    return NextResponse.json({ error: 'Parâmetro de busca de usuário ausente ou inválido.' }, { status: 400 });

  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar usuários.' }, { status: 500 });
  }
}