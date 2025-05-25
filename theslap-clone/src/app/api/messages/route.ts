// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import prisma from '@/lib/prisma';

// POST: Enviar uma nova mensagem
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado. Faça login para enviar mensagens.' }, { status: 401 });
  }
  const senderId = session.user.sub; // ID do remetente (usuário logado)

  try {
    const body = await req.json();
    const { receiverId, textContent, imageUrl1, imageUrl2 } = body;

    if (!receiverId) {
      return NextResponse.json({ error: 'ID do destinatário é obrigatório.' }, { status: 400 });
    }
    if (receiverId === senderId) {
        return NextResponse.json({ error: 'Você não pode enviar uma mensagem para si mesmo.' }, { status: 400 });
    }
    if (!textContent?.trim() && !imageUrl1 && !imageUrl2) {
      return NextResponse.json({ error: 'A mensagem precisa de conteúdo (texto ou imagem).' }, { status: 400 });
    }

    // Verificar se o destinatário existe
    const receiverExists = await prisma.user.findUnique({ where: { id: receiverId } });
    if (!receiverExists) {
      return NextResponse.json({ error: 'Destinatário não encontrado.' }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        textContent: textContent?.trim(),
        imageUrl1,
        imageUrl2,
      },
      include: { // Retornar a mensagem com informações do remetente
        sender: {
            select: { id: true, username: true, name: true, profileImageUrl: true}
        }
      }
    });
    return NextResponse.json(message, { status: 201 }); // 201 Created
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao enviar a mensagem.' }, { status: 500 });
  }
}

// GET: Listar "contatos" (usuários com quem o usuário logado trocou mensagens)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const userId = session.user.sub; // ID do usuário logado

  try {
    // Buscar todas as mensagens onde o usuário logado é o remetente ou o destinatário
    const messagesInvolvingUser = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' }, // Mais recentes primeiro para pegar a última mensagem
      include: {
        sender: { select: { id: true, username: true, name: true, profileImageUrl: true } },
        receiver: { select: { id: true, username: true, name: true, profileImageUrl: true } },
      },
    });

    // Agrupar mensagens por "contato" (o outro usuário na conversa)
    const contactsMap = new Map<string, { user: any; lastMessage: string | null; lastMessageAt: Date | null }>();

    for (const msg of messagesInvolvingUser) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;
      if (otherUser.id === userId) continue; // Ignorar "mensagens para si mesmo" se houver alguma lógica assim

      if (!contactsMap.has(otherUser.id) || (msg.createdAt && contactsMap.get(otherUser.id)!.lastMessageAt! < msg.createdAt) ) {
        contactsMap.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.textContent?.substring(0, 40) || (msg.imageUrl1 || msg.imageUrl2 ? '[Imagem]' : '...'),
          lastMessageAt: msg.createdAt,
        });
      }
    }

    const contacts = Array.from(contactsMap.values()).sort((a, b) => {
        if (!a.lastMessageAt) return 1;
        if (!b.lastMessageAt) return -1;
        return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });

    return NextResponse.json(contacts, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar lista de contatos/mensagens:', error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar contatos.' }, { status: 500 });
  }
}