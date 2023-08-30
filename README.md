# nodejs-redis-email-queue
Node.js Email Queue with Redis Bull and Nodemailer

* [How to Use Queues in Web Applications – Node.js and Redis Tutorial](https://www.freecodecamp.org/news/how-to-use-queues-in-web-applications/)
* [Installing Redis](https://redis.io/docs/getting-started/installation/)

Testing request
```json
{
  "from": "sender@mail.com",
  "to": "recipient@mail.com",
  "subject": "Sending Email using Node.js",
  "text": "That was easy!"
}
```

Check current jobs in queue from `redis-cli` `LRANGE bull:email:wait 0 -1`

## To Do
