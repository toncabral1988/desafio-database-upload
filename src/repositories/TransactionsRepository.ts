import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const income = await this.getTotalIncomes();

    const outcome = await this.getTotalOutcomes();

    return {
      income,
      outcome,
      total: income - outcome,
    };
  }

  private async getTotalIncomes(): Promise<number> {
    const incomes = await this.find({ where: { type: 'income' } });

    return incomes
      .map(income => Number(income.value))
      .reduce((currentValue, total) => currentValue + total, 0);
  }

  private async getTotalOutcomes(): Promise<number> {
    const outcomes = await this.find({ where: { type: 'outcome' } });

    return outcomes
      .map(outcome => Number(outcome.value))
      .reduce((currentValue, total) => Number(currentValue) + total, 0);
  }
}

export default TransactionsRepository;
