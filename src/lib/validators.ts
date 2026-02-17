import { z } from 'zod';
import { VALIDATION } from './constants';

/**
 * Validation schemas for forms
 * Per AGENTS.md: Centralize validation logic
 */

export const loginSchema = z.object({
  identity: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    email: z.email('Invalid email address'),
    username: z
      .string()
      .min(VALIDATION.USERNAME_MIN_LENGTH, `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters`)
      .max(VALIDATION.USERNAME_MAX_LENGTH, `Username must be at most ${VALIDATION.USERNAME_MAX_LENGTH} characters`)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    display_name: z
      .string()
      .max(VALIDATION.DISPLAY_NAME_MAX_LENGTH, `Display name must be at most ${VALIDATION.DISPLAY_NAME_MAX_LENGTH} characters`)
      .optional(),
    password: z
      .string()
      .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  display_name: z
    .string()
    .max(VALIDATION.DISPLAY_NAME_MAX_LENGTH, `Display name must be at most ${VALIDATION.DISPLAY_NAME_MAX_LENGTH} characters`)
    .optional(),
  status: z
    .string()
    .max(VALIDATION.STATUS_MAX_LENGTH, `Status must be at most ${VALIDATION.STATUS_MAX_LENGTH} characters`)
    .optional(),
  bio: z
    .string()
    .max(VALIDATION.BIO_MAX_LENGTH, `Bio must be at most ${VALIDATION.BIO_MAX_LENGTH} characters`)
    .optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4096, 'Message is too long'),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
