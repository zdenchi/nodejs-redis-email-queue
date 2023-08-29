import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import Bull, { Job } from 'bull';
import { EmailType } from './types';

const app = express();
const PORT = 4300;

app.use(express.json());

const emailQueue = new Bull("email", {
  redis: process.env.REDIS_URL,
});

const sendNewEmail = async (email: EmailType) => {
  emailQueue.add({ ...email });
};

const processEmailQueue = async (job: Job) => {
  const { from, to, subject, text } = job.data;
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  console.log("Sending mail to %s", to);

  let info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `<strong>${text}</strong>`,
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));

  return nodemailer.getTestMessageUrl(info);
};

emailQueue.process(processEmailQueue);

app.post("/send-email", async (req, res) => {
  const { from, to, subject, text } = req.body;

  await sendNewEmail({ from, to, subject, text });

  console.log("Added to queue");

  res.json({
    message: "Email Sent",
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
