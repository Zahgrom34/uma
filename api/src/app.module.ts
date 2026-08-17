import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { UiStringsModule } from './ui-strings/ui-strings.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ContentModule,
    ProductsModule,
    CategoriesModule,
    MediaModule,
    PagesModule,
    UiStringsModule,
    SettingsModule,
  ],
})
export class AppModule {}
