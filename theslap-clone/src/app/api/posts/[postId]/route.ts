// src/app/api/posts/[postId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// GET: Obter um post específico com seus comentários
export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const postIdN = parseInt(params.postId, 10);
  if (isNaN(postIdN)) {
    return NextResponse.json({ error: 'ID do post inválido.' }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postIdN },
      include: {
        user: { select: { id: true, username: true, name: true, profileImageUrl: true } },
        comments: { // Incluir comentários do post, ordenados
          orderBy: { createdAt: 'asc' }, // Mais antigos primeiro para ler a conversa
          include: {
            user: { select: { id: true, username: true, name: true, profileImageUrl: true } } // Autor do comentário
          }
        },
        _count: {
            select: { comments: true }
        }
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(post, { status: 200 });
  } catch (error) {
    console.error(`Erro ao buscar post ${params.postId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar o post.' }, { status: 500 });
  }
}


// PUT: Editar um post existente
export async function PUT(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const userId = session.user.sub;
  const postIdN = parseInt(params.postId, 10);

  if (isNaN(postIdN)) {
    return NextResponse.json({ error: 'ID do post inválido.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { textContent, imageUrl1, imageUrl2, mood } = body;

    // Validar se há algum conteúdo para atualizar
    if (textContent === undefined && imageUrl1 === undefined && imageUrl2 === undefined && mood === undefined) {
        return NextResponse.json({ error: 'Nenhum dado fornecido para atualização.' }, { status: 400 });
    }

    const post = await prisma.post.findUnique({ where: { id: postIdN } });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }
    if (post.userId !== userId) {
      return NextResponse.json({ error: 'Não autorizado a editar este post.' }, { status: 403 });
    }

    const updatedData: any = {};
    if (textContent !== undefined) updatedData.textContent = textContent?.trim();
    if (imageUrl1 !== undefined) updatedData.imageUrl1 = imageUrl1; // Permite null para remover imagem
    if (imageUrl2 !== undefined) updatedData.imageUrl2 = imageUrl2; // Permite null para remover imagem
    if (mood !== undefined) updatedData.mood = mood || null;
    updatedData.updatedAt = new Date();


    const updatedPost = await prisma.post.update({
      where: { id: postIdN },
      data: updatedData,
      include: { // Retornar o post atualizado com informações do usuário e contagem de comentários
        user: {
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });
    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error) {
    console.error(`Erro ao editar post ${params.postId}:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao editar o post.' }, { status: 500 });
  }
}

// DELETE: Excluir um post
export async function DELETE(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const userId = session.user.sub;
  const postIdN = parseInt(params.postId, 10);

  if (isNaN(postIdN)) {
    return NextResponse.json({ error: 'ID do post inválido.' }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postIdN } });

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }
    if (post.userId !== userId) {
      // Adicionar lógica para admin no futuro, se necessário
      return NextResponse.json({ error: 'Não autorizado a excluir este post.' }, { status: 403 });
    }

    // O `onDelete: Cascade` no schema do Prisma (para Post.comments)
    // deve cuidar da exclusão dos comentários associados automaticamente.
    await prisma.post.delete({ where: { id: postIdN } });
    return NextResponse.json({ message: 'Post excluído com sucesso.' }, { status: 200 }); // Ou 204 No Content
  } catch (error) {
    console.error(`Erro ao excluir post ${params.postId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao excluir o post.' }, { status: 500 });
  }
}