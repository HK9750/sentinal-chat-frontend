import { z } from 'zod';
import { MAX_MESSAGE_BYTES } from '@/lib/constants';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email, username, or phone number.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerSchema = z
  .object({
    display_name: z.string().trim().min(2, 'Display name is too short.').max(255),
    email: z.string().trim().email().optional().or(z.literal('')),
    username: z.string().trim().min(3).max(64).optional().or(z.literal('')),
    phone_number: z.string().trim().max(32).optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm_password: z.string().min(8, 'Confirm your password.'),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.username && !value.phone_number) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Provide at least one identifier: email, username, or phone number.',
      });
    }

    if (value.password !== value.confirm_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirm_password'],
        message: 'Passwords do not match.',
      });
    }
  });

export const conversationSchema = z.object({
  type: z.enum(['DM', 'GROUP']),
  subject: z.string().trim().max(255).optional().or(z.literal('')),
  description: z.string().trim().max(255).optional().or(z.literal('')),
  participant_ids: z.array(z.string().uuid('Use valid participant UUIDs.')).min(1),
  disappearing_mode: z.enum(['OFF', '24_HOURS', '7_DAYS', '90_DAYS']).default('OFF'),
});

export const messageComposerSchema = z.object({
  text: z.string().max(MAX_MESSAGE_BYTES, 'Message is too large.'),
});
