import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import Bull, { Job } from 'bull';
import { availableParallelism } from 'node:os';
import cluster from 'cluster';

import { EmailType } from './types';

const app = express();
const PORT = 4300;

app.use(express.json());

const numCPUs = availableParallelism();

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function (worker, code, signal) {
    console.log(`Worker ${worker.process.pid} finished. Exit code: ${code}`);

    app.listen(PORT, () => console.log(`Worker ${cluster.worker?.id} launched`));
  });
} else {
  const emailQueue = new Bull("email2", {
    redis: process.env.REDIS_URL,
    settings: {
      backoffStrategies: {
        jitter: function (attemptsMade, err) {
          return 5000 + Math.random() * 500;
        }
      }
    }
  });

  const sendNewEmail = async (email: EmailType) => {
    emailQueue.add({ ...email }, {
      attempts: 3,
      backoff: {
        type: 'jitter'
      }
    });
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
    console.log(`Worker ${cluster.worker?.id} job done`);

    return nodemailer.getTestMessageUrl(info);
  };

  emailQueue.process(processEmailQueue);

  app.post("/send-email", async (req, res) => {
    const { from, to, subject, text } = req.body;

    await sendNewEmail({ from, to, subject, text });
    console.log(`Worker ${cluster.worker?.id} add job to queue`);

    res.json({
      message: "Email Sent",
    });
  });

  app.listen(PORT, () => console.log(`Worker ${cluster.worker?.id} launched`));
}
