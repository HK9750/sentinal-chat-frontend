import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email, username, or phone number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(2, "Display name is too short.")
      .max(255),
    email: z.email().optional().or(z.literal("")),
    username: z.string().trim().min(3).max(64).optional().or(z.literal("")),
    phone_number: z.string().trim().max(32).optional().or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Confirm your password."),
  })
  .superRefine((value, context) => {
    if (!value.email && !value.username && !value.phone_number) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message:
          "Provide at least one identifier: email, username, or phone number.",
      });
    }

    if (value.password !== value.confirm_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_password"],
        message: "Passwords do not match.",
      });
    }
  });
