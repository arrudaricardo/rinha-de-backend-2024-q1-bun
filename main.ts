import {
  processPayment,
  CustomHttpError,
  getAccountTransations,
} from "./db.ts";

interface Transacoe {
  valor: number;
  tipo: string 
  descricao?: string;
}


const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);

  const reTransacoesPath = /\/clientes\/(?<id>.+)\/transacoes/;
  const reExtratoPath = /\/clientes\/(?<id>.+)\/extrato/;

  try {
    if (reTransacoesPath.test(url.pathname)) {
      const match = url.pathname.match(reTransacoesPath) as RegExpMatchArray;
      const id = match.groups!.id;

      const body = (await request.json()) as Transacoe;

      const userAccount = await processPayment(id, body)

      return new Response(JSON.stringify(userAccount), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    } else if (reExtratoPath.test(url.pathname)) {
      const match = url.pathname.match(reExtratoPath) as RegExpMatchArray;
      const id = match.groups!.id;
      const accountTransations = await getAccountTransations(id)

      return new Response(JSON.stringify(accountTransations), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }
  } catch (error) {
    if (error instanceof CustomHttpError) {
      return new Response(JSON.stringify(error.message), {
        status: error.httpCode,
        headers: {
          "content-type": "text/plain; charset=utf-8",
        },
      });
    }
    throw error;
  }

  throw new Error("No route handler was found for the path.");
};


Bun.serve({
  fetch(req) {
    return handler(req)
  },
  port: 8080,
});