// src/app/api/messages/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// GET: Obter mensagens de uma conversa específica
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } } // userId aqui é o ID do OUTRO participante da conversa
) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const loggedInUserId = session.user.sub; // ID do usuário logado
  const otherUserId = params.userId; // ID do outro usuário na conversa

  if (!otherUserId) {
    return NextResponse.json({ error: 'ID do outro usuário não fornecido.' }, { status: 400 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [ // Mensagens entre o usuário logado e o outro usuário
          { senderId: loggedInUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: loggedInUserId },
        ],
      },
      orderBy: { createdAt: 'asc' }, // Mensagens mais antigas primeiro para exibir na ordem correta
      include: {
        sender: { select: { id: true, username: true, name: true, profileImageUrl: true } },
        // Opcionalmente, incluir receiver também, mas geralmente não é necessário se você já sabe quem são os dois participantes
        // receiver: { select: { id: true, username: true, name: true, profileImageUrl: true } },
      },
      take: 100, // Limitar a quantidade de mensagens carregadas por vez (implementar paginacao no futuro)
    });
    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error(`Erro ao buscar mensagens com usuário ${otherUserId}:`, error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar mensagens da conversa.' }, { status: 500 });
  }
}