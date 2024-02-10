import postgres from "postgres";

export const sql = postgres({
  user: "postgres",
  database: "postgres",
  hostname: "postgres",
  password: "postgres",
  port: 5432,
});

export class CustomHttpError extends Error {
  constructor(readonly httpCode: number, readonly message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export interface Account {
  id: number;
  limite: number;
  saldo: number;
}

export interface UserAccountTransaction {
  valor: number;
  tipo: string;
  descricao?: string;
  realizada_em?: string;
}

interface TransacoeResponse {
  saldo: {
    total: number;
    data_extrato: string;
    limite: number;
  };
  ultimas_transacoes: Array<UserAccountTransaction>;
}

export async function getUserAccount(id: number | string): Promise<Account> {
  const userAccount = await sql`SELECT id, saldo, limite FROM account where id = ${id}`;
  if (!userAccount[0]) {
    throw new CustomHttpError(404, "User not found");
  }
  return {
    id: userAccount[0].id,
    saldo: userAccount[0].saldo,
    limite: userAccount[0].limite,
  };
}

export async function processPayment(
  id: string,
  transaction: Omit<UserAccountTransaction, "realizada_em">
): Promise<Omit<Account, "id">> {
  if (!["d", "c"].includes(transaction.tipo)) {
    throw new CustomHttpError(422, "Invalid transaction type");
  }
  if (!transaction.descricao || transaction.descricao.length > 10) {
    throw new CustomHttpError(422, "Invalid descricao");
  }
  const userAccount = await getUserAccount(id);
  const valor =
    transaction.tipo === "d" ? -transaction.valor : transaction.valor;
  const updatedUserAccount = {
    limite: userAccount.limite,
    saldo: userAccount.saldo + valor,
  };

  if (
    updatedUserAccount.saldo < -updatedUserAccount.limite ||
    valor % 1 !== 0
  ) {
    throw new CustomHttpError(422, "Operation not allowed, insufficient funds");
  }

  await sql.begin(async (sql) => {
    await sql`
      INSERT INTO account_transaction (account_id, valor, tipo, descricao, realizada_em)
      VALUES (${id}, ${transaction.valor}, ${transaction.tipo}, ${transaction.descricao ?? ''}, ${new Date().toISOString()})
    `;

    await sql`
      UPDATE account SET saldo = ${updatedUserAccount.saldo} WHERE id = ${id}
    `;
  });

  return updatedUserAccount;
}

export async function getAccountTransations(
  id: number | string
): Promise<TransacoeResponse> {
  const userAccount = await getUserAccount(id);
  const rows = await sql<[UserAccountTransaction]>`
    SELECT t.valor, t.tipo, t.descricao, t.realizada_em FROM account_transaction t WHERE t.account_id = ${id} ORDER BY realizada_em DESC LIMIT 10
  `;
  return {
    saldo: {
      total: userAccount.saldo,
      data_extrato: new Date().toISOString(),
      limite: userAccount.limite,
    },
    ultimas_transacoes: rows.map((userAccounts) => ({
      valor: userAccounts.valor,
      tipo: userAccounts.tipo,
      descricao: userAccounts.descricao,
      realizada_em: userAccounts.realizada_em,
    })),
  };
}
