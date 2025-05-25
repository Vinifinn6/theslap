// src/app/api/users/[userId]/replies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } } // userId aqui é o Auth0 ID
) {
  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'ID do usuário não fornecido.' }, { status: 400 });
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { // Autor do comentário (que é o próprio usuário do perfil, mas bom para consistência)
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
        post: { // Para saber a qual post o comentário pertence e quem é o autor do post
          select: {
            id: true,
            textContent: true, // Um trecho do post original
            user: { // Autor do post original
                select: { id: true, username: true, name: true, profileImageUrl: true }
            }
          }
        }
      },
      take: 20, // Limitar a quantidade de respostas retornadas
    });
    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error(`Erro ao buscar respostas (comentários) do usuário ${userId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar respostas.' }, { status: 500 });
  }
}