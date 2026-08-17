export const mediaBaseUrl = (): string => (process.env.MEDIA_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
export const mediaUrl = (filename: string): string => `${mediaBaseUrl()}/media/${filename}`;
export const thumbUrl = (filename: string): string => `${mediaBaseUrl()}/media/thumbs/${filename}`;
