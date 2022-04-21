import DatabaseManager from '@cardstack/db';
import { inject } from '@cardstack/di';
import { EmailCardDropRequest } from '../routes/email-card-drop-requests';
import { buildConditions } from '../utils/queries';

interface EmailCardDropRequestsQueriesFilter {
  ownerAddress: string;
}

export default class EmailCardDropRequestsQueries {
  databaseManager: DatabaseManager = inject('database-manager', { as: 'databaseManager' });

  async insert(model: EmailCardDropRequest): Promise<EmailCardDropRequest> {
    let db = await this.databaseManager.getClient();

    let { rows } = await db.query(
      'INSERT INTO email_card_drop_requests (id, owner_address, email_hash, verification_code, requested_at, claimed_at, transaction_hash) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        model.id,
        model.ownerAddress,
        model.emailHash,
        model.verificationCode,
        model.requestedAt,
        model.claimedAt,
        model.transactionHash,
      ]
    );

    return rows[0];
  }

  async query(filter: EmailCardDropRequestsQueriesFilter): Promise<EmailCardDropRequest[]> {
    let db = await this.databaseManager.getClient();

    const conditions = buildConditions(filter);

    const query = `SELECT * FROM email_card_drop_requests WHERE ${conditions.where}`;
    const queryResult = await db.query(query, conditions.values);

    return queryResult.rows.map((row) => {
      return {
        id: row['id'],
        ownerAddress: row['owner_address'],
        emailHash: row['email_hash'],
        verificationCode: row['verification_code'],
        claimedAt: row['claimed_at'],
        requestedAt: row['requested_at'],
        transactionHash: row['transaction_hash'],
      };
    });
  }
}

declare module '@cardstack/hub/queries' {
  interface KnownQueries {
    'email-card-drop-requests': EmailCardDropRequestsQueries;
  }
}