// src/app/api/users/[userId]/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } } // userId aqui é o Auth0 ID (ou o ID do seu BD)
) {
  const { userId } = params;

  if (!userId) {
    return NextResponse.json({ error: 'ID do usuário não fornecido.' }, { status: 400 });
  }

  try {
    const posts = await prisma.post.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { // Para mostrar informações do autor do post
          select: { id: true, username: true, name: true, profileImageUrl: true },
        },
        _count: { // Contar comentários
            select: { comments: true }
        },
        // Não incluir todos os comentários aqui para não pesar,
        // eles podem ser carregados sob demanda ou na página de detalhes do post.
        // Se for uma view de "PostCard" que mostra alguns comentários, pode incluir um 'take' nos comentários.
      },
      take: 20, // Limitar a quantidade de posts retornados por padrão
    });
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error(`Erro ao buscar posts do usuário ${userId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar posts.' }, { status: 500 });
  }
}