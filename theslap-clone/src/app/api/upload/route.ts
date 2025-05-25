// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { uploadToImgur } from '@/lib/imgur'; // Função que criamos anteriormente

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Não autorizado. Faça login para fazer upload.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { imageBase64 } = body; // Espera um JSON com { imageBase64: "data:image/..." }

    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image')) {
      return NextResponse.json({ error: 'Dados da imagem ausentes ou em formato inválido.' }, { status: 400 });
    }

    const imageUrl = await uploadToImgur(imageBase64);

    if (imageUrl) {
      return NextResponse.json({ imageUrl }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Falha ao fazer upload da imagem para o Imgur.' }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro na API de upload:', error);
    // Verifica se o erro é de parsing do JSON
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).'}, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor ao processar o upload.' }, { status: 500 });
  }
}