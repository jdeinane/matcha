import { z } from "zod";

export const registerSchema = z.object({
	username: z.string()
		.trim()
		.min(3, "Username must be at least 3 characters long")
		.max(30, "Username must not exceed 30 characters")
		.regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, underscores, and hyphens"),
	email: z.string()
		.trim()
		.toLowerCase()
		.email({ message: "Please enter a valid email address." })
		.max(255, "Email must not exceed 255 characters"),
	first_name: z.string()
		.trim()
		.min(2, "First name must be at least 2 characters")
		.max(50, "First name must not exceed 50 characters"),
	last_name: z.string()
		.trim()
		.min(2, "Last name must be at least 2 characters")
		.max(50, "Last name must not exceed 50 characters"),
	password: z.string()
		.min(8, "Password must be at least 8 characters long")
		.max(32, "Password must not exceed 32 characters")
		.regex(/[A-Z]/, "Password must include at least one uppercase letter")
		.regex(/[0-9]/, "Password must include at least one number")
		.regex(/[^A-Za-z0-9]/, "Password must include at least one special character"),
});

export const loginSchema = z.object({
	username: z.string().trim().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
	email: z.string().email({ message: "Invalid email address" }),
});

export const resetPasswordSchema = z.object({
	token: z.string(),
	newPassword: z.string()
		.min(8, "Password must be at least 8 characters long")
		.regex(/[A-Z]/, "Must include uppercase")
		.regex(/[0-9]/, "Must include number")
		.regex(/[^A-Za-z0-9]/, "Must include special char"),
});

export const updateAccountSchema = z.object({
	email: z.string().email().optional(),
	first_name: z.string().min(2).max(50).optional(),
	last_name: z.string().min(2).max(50).optional(),
});
