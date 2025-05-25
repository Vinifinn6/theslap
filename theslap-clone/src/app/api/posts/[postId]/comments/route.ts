// src/app/api/posts/[postId]/comments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// POST: Criar um novo comentário em um post
export async function POST(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado. Faça login para comentar.' }, { status: 401 });
  }
  const userId = session.user.sub; // ID do usuário que está comentando
  const postIdN = parseInt(params.postId, 10);

  if (isNaN(postIdN)) {
    return NextResponse.json({ error: 'ID do post inválido.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { textContent, imageUrl1, imageUrl2 } = body;

    if (!textContent?.trim() && !imageUrl1 && !imageUrl2) {
      return NextResponse.json({ error: 'O comentário precisa de conteúdo (texto ou imagem).' }, { status: 400 });
    }

    // Verificar se o post existe
    const postExists = await prisma.post.findUnique({ where: { id: postIdN } });
    if (!postExists) {
      return NextResponse.json({ error: 'Post não encontrado para comentar.' }, { status: 404 });
    }

    // Verificar se o usuário (comentarista) existe no nosso banco
    const commenterExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!commenterExists) {
        return NextResponse.json({ error: 'Usuário comentarista não encontrado. Complete seu perfil.' }, { status: 403 });
    }


    const comment = await prisma.comment.create({
      data: {
        userId,
        postId: postIdN,
        textContent: textContent?.trim(),
        imageUrl1,
        imageUrl2,
      },
      include: { // Retornar o comentário com informações do usuário
        user: {
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
      },
    });
    return NextResponse.json(comment, { status: 201 }); // 201 Created
  } catch (error) {
    console.error(`Erro ao criar comentário no post ${params.postId}:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao criar o comentário.' }, { status: 500 });
  }
}

// GET para comentários de um post específico já é tratado em GET /api/posts/[postId]
// Se você quisesse uma rota dedicada apenas para comentários de um post, poderia adicionar um GET aqui.
// Exemplo:
/*
export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const postIdN = parseInt(params.postId, 10);
  if (isNaN(postIdN)) {
    return NextResponse.json({ error: 'ID do post inválido.' }, { status: 400 });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { postId: postIdN },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, username: true, name: true, profileImageUrl: true } },
      },
    });
    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error(`Erro ao buscar comentários do post ${params.postId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
*/