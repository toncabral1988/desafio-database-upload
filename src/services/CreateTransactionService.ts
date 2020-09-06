import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: 'string';
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category_title,
  }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (type === 'outcome') {
      const hasBalance = await this.hasBalance(
        type,
        transactionsRepository,
        value,
      );

      if (!hasBalance) {
        throw new AppError(
          'The value of the current transaction is greater than the balance',
        );
      }
    }

    const category = await this.findOrCreateCategory(category_title);

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }

  private async hasBalance(
    type: string,
    transactionsRepository: TransactionsRepository,
    value: number,
  ): Promise<boolean> {
    const balance = await transactionsRepository.getBalance();

    return balance.total >= value;
  }

  private async findOrCreateCategory(title: string): Promise<Category> {
    const categoryRepository = getRepository(Category);

    let category = await categoryRepository.findOne({
      where: { title },
    });

    if (category) {
      return category;
    }

    category = categoryRepository.create({
      title,
    });

    await categoryRepository.save(category);

    return category;
  }
}

export default CreateTransactionService;
