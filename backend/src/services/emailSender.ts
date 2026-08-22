import nodemailer from 'nodemailer';

/**
 * Service to handle SMTP sending using Ethereal Email for testing.
 * Caches the test account to avoid creating a new one on every send, which is slow.
 */
export class EmailSenderService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initializes and caches the transporter.
   */
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    try {
      console.log('🔄 Creating Ethereal Email test account...');
      const testAccount = await nodemailer.createTestAccount();
      
      console.log(`✅ Ethereal account created: User=${testAccount.user}`);
      
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      return this.transporter;
    } catch (error) {
      console.error('❌ Failed to create Ethereal transporter:', error);
      throw error;
    }
  }

  /**
   * Sends an email and returns the message ID and Ethereal preview URL.
   */
  public static async sendEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<{ messageId: string; previewUrl: string }> {
    const transporter = await this.getTransporter();

    const mailOptions = {
      from: '"ReachInbox Scheduler" <scheduler@reachinbox.co>',
      to,
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; padding: 20px;">
        <h2>${subject}</h2>
        <p>${body.replace(/\n/g, '<br>')}</p>
      </div>`,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log(`✉️ Email sent to ${to}: MessageID=${info.messageId}`);
    if (previewUrl) {
      console.log(`🔗 Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || '',
    };
  }
}
