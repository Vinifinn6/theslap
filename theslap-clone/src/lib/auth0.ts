// src/lib/auth0.ts
// As configurações principais para o @auth0/nextjs-auth0 SDK são lidas
// automaticamente das variáveis de ambiente:
// - AUTH0_SECRET
// - AUTH0_BASE_URL
// - AUTH0_ISSUER_BASE_URL
// - AUTH0_CLIENT_ID
// - AUTH0_CLIENT_SECRET
// - AUTH0_AUDIENCE (opcional, se você usa getAccessToken para uma API externa)
// - AUTH0_SCOPE (padrão: 'openid profile email')

// Você pode importar funções como `getSession`, `handleAuth`, `withApiAuthRequired`,
// `withPageAuthRequired` diretamente de '@auth0/nextjs-auth0' nos seus
// componentes de servidor, API routes, ou páginas.

// Exemplo de como obter a sessão em um Server Component ou API Route:
/*
import { getSession } from '@auth0/nextjs-auth0';

export async function someServerFunction() {
  const session = await getSession();
  if (session?.user) {
    console.log(session.user);
  }
}
*/

// Não há necessidade de exportar uma configuração explícita daqui a menos que
// você tenha um caso de uso muito específico que o SDK não cubra automaticamente.
// Apenas garanta que suas variáveis de ambiente estão corretamente configuradas.