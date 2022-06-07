import DatabaseManager from '@cardstack/db';
import { inject } from '@cardstack/di';

export default class ExchangeRatesQueries {
  databaseManager: DatabaseManager = inject('database-manager', { as: 'databaseManager' });

  async insert(from: string, to: string, rate: number, date: string, exchange: string): Promise<void> {
    let db = await this.databaseManager.getClient();

    await db.query(
      `
        INSERT INTO exchange_rates (date, exchange, from_symbol, to_symbol, rate)
        VALUES(
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `,
      [date, exchange, from, to, rate]
    );
  }

  async select(from: string, to: string, date: string, exchange = 'CCCAGG'): Promise<number | null> {
    let db = await this.databaseManager.getClient();

    let { rows } = await db.query(
      `
        SELECT rate FROM exchange_rates
        WHERE from_symbol=$1 AND to_symbol=$2 AND date=$3 AND exchange=$4
        LIMIT 1
      `,
      [from, to, date, exchange]
    );

    if (rows.length) {
      // TODO why is this coming out as a string?
      return parseFloat(rows[0].rate);
    } else {
      return null;
    }
  }
}

declare module '@cardstack/hub/queries' {
  interface KnownQueries {
    'exchange-rates': ExchangeRatesQueries;
  }
}