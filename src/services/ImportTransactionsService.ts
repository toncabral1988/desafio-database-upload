import { getCustomRepository, getRepository, In } from 'typeorm';
import path from 'path';
import csvParse from 'csv-parse';
import fs from 'fs';

import uploadConfig from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface RequestDTO {
  csv_filename: string;
}

interface TransactionFromCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ csv_filename }: RequestDTO): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const csvFilePath = path.join(uploadConfig.directory, csv_filename);

    const {
      transactionsFromCSV,
      categoriesFromCSV,
    } = await this.convertCsvToTransactions(csvFilePath);

    const categories = await this.findOrCreateCategories(categoriesFromCSV);

    const transactionsToCreate = transactionsFromCSV.map(transactionFromCSV => {
      const {
        title,
        type,
        value,
        category: category_title,
      } = transactionFromCSV;
      const indexCategory = categories.findIndex(
        category => category.title === category_title,
      );

      const category = categories[indexCategory];

      return {
        title,
        type,
        value,
        category,
      };
    });

    const transactions = transactionsRepository.create(transactionsToCreate);

    await transactionsRepository.save(transactions);

    return transactions;
  }

  private async findOrCreateCategories(
    categories: string[],
  ): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);

    const existentCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const addCategoryTitles = categories.filter(
      category =>
        !existentCategories.some(
          existentCategory => existentCategory.title === category,
        ),
    );

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(addCategoryTitle => ({ title: addCategoryTitle })),
    );

    await categoriesRepository.save(newCategories);

    return [...existentCategories, ...newCategories];
  }

  private async convertCsvToTransactions(
    csvFilePath: string,
  ): Promise<{
    transactionsFromCSV: TransactionFromCSV[];
    categoriesFromCSV: string[];
  }> {
    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: TransactionFromCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      if (!categories.includes(category)) {
        categories.push(category);
      }

      transactions.push({
        title,
        type,
        value: Number(value),
        category,
      });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return { transactionsFromCSV: transactions, categoriesFromCSV: categories };
  }
}

export default ImportTransactionsService;
