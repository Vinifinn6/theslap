// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// POST: Criar um novo post
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado. Faça login para criar um post.' }, { status: 401 });
  }
  const userId = session.user.sub;

  try {
    const body = await req.json();
    const { textContent, imageUrl1, imageUrl2, mood } = body;

    if (!textContent?.trim() && !imageUrl1 && !imageUrl2) {
      return NextResponse.json({ error: 'O post precisa de conteúdo (texto ou imagem).' }, { status: 400 });
    }

    // Validar se o usuário (autor) existe no nosso banco de dados.
    // O fluxo de profile-setup deveria garantir isso.
    const authorExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!authorExists) {
        // Este caso pode indicar um problema no fluxo de onboarding do usuário.
        return NextResponse.json({ error: 'Autor não encontrado em nosso sistema. Complete seu perfil.' }, { status: 403 });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        textContent: textContent?.trim(),
        imageUrl1,
        imageUrl2,
        mood: mood || null, // Garante que seja null se vazio
      },
      include: { // Retornar o post com informações do usuário e contagem de comentários
        user: {
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });
    return NextResponse.json(post, { status: 201 }); // 201 Created
  } catch (error) {
    console.error('Erro ao criar post:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar o post.' }, { status: 500 });
  }
}

// GET: Obter posts (feed principal, "The Right Now", ou busca por posts)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get('limit');
  const forRightNow = searchParams.get('rightNow') === 'true';
  const searchQuery = searchParams.get('searchQuery');

  const limit = limitParam ? parseInt(limitParam, 10) : (forRightNow ? 1 : 10); // Default 1 para rightNow, 10 para feed

  if (isNaN(limit) || limit <= 0) {
    return NextResponse.json({ error: "Parâmetro 'limit' inválido." }, { status: 400 });
  }

  try {
    let whereCondition: any = {}; // Condição de busca para o Prisma

    if (searchQuery) {
      whereCondition.textContent = {
        contains: searchQuery,
        mode: 'insensitive', // Busca case-insensitive
      };
    }
    // Para "The Right Now", não aplicamos o searchQuery, apenas pegamos o mais recente.
    // Se não for 'rightNow' e houver 'searchQuery', ele será usado.

    const posts = await prisma.post.findMany({
      where: forRightNow ? {} : whereCondition, // Se for "rightNow", ignora o searchQuery (pega qualquer post mais recente)
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
        _count: {
          select: { comments: true },
        },
        // Para o feed, geralmente não carregamos todos os comentários de cada post aqui.
        // A contagem (_count) é suficiente. Comentários são carregados ao ver o post individualmente ou ao expandir.
      },
    });
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar posts.' }, { status: 500 });
  }
}