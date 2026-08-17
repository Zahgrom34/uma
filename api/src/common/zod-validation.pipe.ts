import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * Validates a request body against a zod schema.
 * On failure returns 400 { message, fieldErrors } with Russian admin-facing messages.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_';
      if (!(path in fieldErrors)) fieldErrors[path] = issue.message;
    }
    throw new BadRequestException({
      message: 'Проверьте заполнение формы',
      fieldErrors,
    });
  }
}
