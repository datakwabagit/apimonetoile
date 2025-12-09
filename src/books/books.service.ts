import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Book, BookDocument } from './schemas/book.schema';
import { BookPurchase, BookPurchaseDocument } from './schemas/book-purchase.schema';
import { CreateBookDto } from './dto/create-book.dto';
import { PurchaseBookDto } from './dto/purchase-book.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BooksService {
  constructor(
    @InjectModel(Book.name) private bookModel: Model<BookDocument>,
    @InjectModel(BookPurchase.name) private bookPurchaseModel: Model<BookPurchaseDocument>,
  ) {}

  // Récupérer tous les livres disponibles
  async findAll(): Promise<Book[]> {
    return this.bookModel.find({ isAvailable: true }).sort({ createdAt: -1 }).lean().exec();
  }

  // Récupérer un livre par son bookId
  async findByBookId(bookId: string): Promise<Book> {
    const book = await this.bookModel.findOne({ bookId, isAvailable: true }).lean().exec();
    if (!book) {
      throw new NotFoundException(`Livre ${bookId} non trouvé`);
    }
    return book;
  }

  // Créer un nouveau livre (admin uniquement)
  async create(createBookDto: CreateBookDto): Promise<Book> {
    const existingBook = await this.bookModel.findOne({ bookId: createBookDto.bookId }).exec();
    if (existingBook) {
      throw new BadRequestException(`Un livre avec l'ID ${createBookDto.bookId} existe déjà`);
    }

    const newBook = new this.bookModel(createBookDto);
    return newBook.save();
  }

  // Enregistrer un achat de livre après paiement validé
  async recordPurchase(purchaseDto: PurchaseBookDto, userId?: string): Promise<BookPurchase> {
    // Vérifier que le livre existe
    const book = await this.bookModel.findOne({ bookId: purchaseDto.bookId }).exec();
    if (!book) {
      throw new NotFoundException(`Livre ${purchaseDto.bookId} non trouvé`);
    }

    // Vérifier que l'achat n'existe pas déjà pour ce paiement
    const existingPurchase = await this.bookPurchaseModel
      .findOne({ paymentId: purchaseDto.paymentId })
      .exec();
    if (existingPurchase) {
      return existingPurchase; // Retourner l'achat existant (idempotence)
    }

    // Générer un token de téléchargement unique et sécurisé
    const downloadToken = this.generateDownloadToken();

    // Créer l'achat
    const purchase = new this.bookPurchaseModel({
      userId: userId || null,
      bookId: book._id,
      paymentId: purchaseDto.paymentId,
      bookIdentifier: purchaseDto.bookId,
      bookTitle: book.title,
      price: purchaseDto.price,
      customerName: purchaseDto.customerName,
      customerPhone: purchaseDto.customerPhone,
      customerEmail: purchaseDto.customerEmail,
      downloadToken,
      downloadCount: 0,
      expiresAt: null, // Pas d'expiration par défaut
    });

    const savedPurchase = await purchase.save();

    // Incrémenter le compteur d'achats du livre
    await this.bookModel.findByIdAndUpdate(book._id, { $inc: { purchaseCount: 1 } }).exec();

    return savedPurchase;
  }

  // Vérifier si un utilisateur a acheté un livre
  async checkPurchase(bookId: string, userIdOrPhone: string): Promise<BookPurchase | null> {
    // Rechercher par userId ou par téléphone
    const purchase = await this.bookPurchaseModel
      .findOne({
        bookIdentifier: bookId,
        $or: [{ userId: userIdOrPhone }, { customerPhone: userIdOrPhone }],
      })
      .populate('bookId')
      .lean()
      .exec();

    return purchase;
  }

  // Vérifier un token de téléchargement et retourner les infos
  async verifyDownloadToken(token: string): Promise<{
    purchase: BookPurchase;
    book: Book;
    filePath: string;
  }> {
    const purchase = await this.bookPurchaseModel
      .findOne({ downloadToken: token })
      .populate('bookId')
      .exec();

    if (!purchase) {
      throw new ForbiddenException('Token de téléchargement invalide');
    }

    // Vérifier l'expiration si définie
    if (purchase.expiresAt && new Date() > purchase.expiresAt) {
      throw new ForbiddenException('Le lien de téléchargement a expiré');
    }

    const book = await this.bookModel.findById(purchase.bookId).exec();
    if (!book) {
      throw new NotFoundException('Livre non trouvé');
    }

    // Construire le chemin du fichier PDF
    const filePath = path.join(process.cwd(), 'public', 'books', 'pdf', book.pdfFileName);

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Fichier PDF non trouvé: ${book.pdfFileName}`);
    }

    // Incrémenter les compteurs de téléchargement
    await this.bookPurchaseModel
      .findByIdAndUpdate(purchase._id, {
        $inc: { downloadCount: 1 },
        lastDownloadAt: new Date(),
      })
      .exec();

    await this.bookModel.findByIdAndUpdate(book._id, { $inc: { downloadCount: 1 } }).exec();

    return { purchase, book, filePath };
  }

  // Récupérer les achats d'un utilisateur
  async getUserPurchases(userIdOrPhone: string): Promise<BookPurchase[]> {
    return this.bookPurchaseModel
      .find({
        $or: [{ userId: userIdOrPhone }, { customerPhone: userIdOrPhone }],
      })
      .populate('bookId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // Générer un token de téléchargement sécurisé
  private generateDownloadToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Méthode pour initialiser les livres depuis le frontend (une fois)
  async seedBooks(): Promise<Book[]> {
    const booksToSeed = [
      {
        bookId: 'secrets-ancestraux',
        title: 'Les Secrets Ancestraux',
        subtitle: 'Sagesse Africaine et Spiritualité',
        description:
          "Découvrez les enseignements sacrés transmis de génération en génération. Ce livre révèle les pratiques spirituelles, rituels et connaissances ésotériques de l'Afrique traditionnelle.",
        price: 5000,
        pages: 250,
        coverImage: '/books/secrets-ancestraux.jpg',
        category: 'Spiritualité',
        rating: 4.9,
        pdfFileName: 'secrets-ancestraux.pdf',
      },
      {
        bookId: 'astrologie-africaine',
        title: 'Astrologie Africaine',
        subtitle: 'Le Zodiaque Ancestral',
        description:
          'Explorez le système astrologique africain unique qui relie les cycles cosmiques aux traditions ancestrales. Comprenez votre signe et votre destinée selon la sagesse des anciens.',
        price: 4500,
        pages: 180,
        coverImage: '/books/astrologie-africaine.jpg',
        category: 'Astrologie',
        rating: 4.8,
        pdfFileName: 'astrologie-africaine.pdf',
      },
      {
        bookId: 'numerologie-sacree',
        title: 'Numérologie Sacrée',
        subtitle: 'Les Nombres de Votre Destin',
        description:
          "Les nombres révèlent votre mission de vie, vos talents cachés et vos cycles d'évolution. Apprenez à décoder les messages numériques qui guident votre existence.",
        price: 3500,
        pages: 150,
        coverImage: '/books/numerologie-sacree.jpg',
        category: 'Numérologie',
        rating: 4.7,
        pdfFileName: 'numerologie-sacree.pdf',
      },
      {
        bookId: 'rituels-puissance',
        title: 'Rituels de Puissance',
        subtitle: 'Invocations et Pratiques Magiques',
        description:
          "Guide pratique des rituels efficaces pour la protection, l'abondance, l'amour et la transformation. Chaque rituel est expliqué étape par étape avec les incantations authentiques.",
        price: 6000,
        pages: 300,
        coverImage: '/books/rituels-puissance.jpg',
        category: 'Pratiques',
        rating: 5.0,
        pdfFileName: 'rituels-puissance.pdf',
      },
    ];

    const createdBooks = [];
    for (const bookData of booksToSeed) {
      const existing = await this.bookModel.findOne({ bookId: bookData.bookId }).exec();
      if (!existing) {
        const book = new this.bookModel(bookData);
        createdBooks.push(await book.save());
      }
    }

    return createdBooks;
  }
}
