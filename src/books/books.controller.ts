import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { Public } from '../common/decorators/public.decorator';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // GET /books - Liste de tous les livres disponibles (public)
  @Public()
  @Get()
  async findAll() {
    const books = await this.booksService.findAll();
    return {
      success: true,
      books: books.map((book: any) => ({
        id: book._id.toString(),
        bookId: book.bookId,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        price: book.price,
        pages: book.pages,
        category: book.category,
        rating: book.rating,
        coverImage: book.coverImage,
        purchaseCount: book.purchaseCount,
      })),
    };
  }

  // GET /books/:bookId - Détails d'un livre (public)
  @Public()
  @Get(':bookId')
  async findOne(@Param('bookId') bookId: string) {
    const book = await this.booksService.findByBookId(bookId);
    return {
      success: true,
      book: {
        id: (book as any)._id.toString(),
        bookId: book.bookId,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        price: book.price,
        pages: book.pages,
        category: book.category,
        rating: book.rating,
        coverImage: book.coverImage,
        purchaseCount: book.purchaseCount,
      },
    };
  }

  // POST /books - Créer un livre (admin uniquement)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.CREATE_SERVICE)
  @Post()
  async create(@Body() createBookDto: CreateBookDto) {
    const book = await this.booksService.create(createBookDto);
    return {
      success: true,
      message: 'Livre créé avec succès',
      book,
    };
  }

  // GET /books/:bookId/download?token=xxx - Télécharger un livre acheté (public avec token)
  @Public()
  @Get(':bookId/download')
  async downloadBook(
    @Param('bookId') bookId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!token) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'Token de téléchargement requis',
      });
    }

    try {
      const { purchase, book, filePath } = await this.booksService.verifyDownloadToken(token);

      // Vérifier que le bookId correspond
      if (purchase.bookIdentifier !== bookId) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Token invalide pour ce livre',
        });
      }

      // Envoyer le fichier PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${book.pdfFileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({
        success: false,
        message: error.message || 'Erreur lors du téléchargement',
      });
    }
  }

  // POST /books/:bookId/check-purchase - Vérifier si un utilisateur a acheté un livre
  @Public()
  @Post(':bookId/check-purchase')
  @HttpCode(HttpStatus.OK)
  async checkPurchase(@Param('bookId') bookId: string, @Body() body: { phone: string }) {
    const purchase = await this.booksService.checkPurchase(bookId, body.phone);

    if (!purchase) {
      return {
        success: false,
        purchased: false,
        message: 'Aucun achat trouvé pour ce livre',
      };
    }

    return {
      success: true,
      purchased: true,
      downloadToken: purchase.downloadToken,
      downloadUrl: `/api/v1/books/${bookId}/download?token=${purchase.downloadToken}`,
    };
  }

  // GET /books/user/purchases?phone=xxx - Récupérer les achats d'un utilisateur (public avec phone)
  @Public()
  @Get('user/purchases')
  async getUserPurchases(@Query('phone') phone: string) {
    if (!phone) {
      return {
        success: false,
        message: 'Numéro de téléphone requis',
      };
    }

    const purchases = await this.booksService.getUserPurchases(phone);

    return {
      success: true,
      purchases: purchases.map((p: any) => ({
        id: p._id.toString(),
        bookId: p.bookIdentifier,
        bookTitle: p.bookTitle,
        price: p.price,
        purchaseDate: p.createdAt,
        downloadCount: p.downloadCount,
        lastDownloadAt: p.lastDownloadAt,
        downloadUrl: `/api/v1/books/${p.bookIdentifier}/download?token=${p.downloadToken}`,
      })),
    };
  }

  // POST /books/seed - Initialiser les livres (admin uniquement, à exécuter une fois)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(Permission.CREATE_SERVICE)
  @Post('seed')
  async seedBooks() {
    const books = await this.booksService.seedBooks();
    return {
      success: true,
      message: `${books.length} livre(s) créé(s)`,
      books,
    };
  }
}
