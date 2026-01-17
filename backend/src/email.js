import nodemailer from "nodemailer";

// Configuration pour Ethereal (faux SMTP pour dev)
// On peut aussi utiliser un vrai compte Gmail
const transporter = nodemailer.createTransport({
	host: 'smtp.ethereal.email',
	port: 587,
	auth: {
		user: 'hello.world@ethereal.email', // a remplacer
		pass: 'E6XbK3x4Wq'
	}
});

export const sendEmail = async (toString, subject, html) => {
	try {
		const testAccount = await nodemailer.createTestAccount();

		const devTransporter = nodemailer.createTransport({
			host: "smtp.ethereal.email",
			port: 587,
			secure: false,
			auth: {
				user: testAccount.user,
				pass: testAccount.pass,
			},
		});

		const info = await devTransporter.sendMail({
			from: '"iced blueberry matcha" <no-reply@matcha.com>',
			to: toString,
			subject: subject,
			html: html,
		});

		console.log("📧 Email sent: %s", info.messageId);
        console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info)); // cliquer ici sur la console
	
	} catch (error) {
		console.error("Email error:", error);
	}
};
