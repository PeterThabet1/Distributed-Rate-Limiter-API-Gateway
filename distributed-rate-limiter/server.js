require('dotenv').config();
const express = require('express');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

const app = express();
const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
});

const rateLimitScript = fs.readFileSync(path.join(__dirname, 'rateLimit.lua'), 'utf8');

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT);
const TIME_WINDOW = parseInt(process.env.TIME_WINDOW);

// Middleware for rate limiting
async function rateLimiter(req, res, next) {
    const ip = req.ip;
    try {
        const allowed = await client.eval(rateLimitScript, 1, ip, RATE_LIMIT, TIME_WINDOW);
        if (allowed === 1) {
            next();
        } else {
            res.status(429).send('Too Many Requests');
        }
    } catch (err) {
        console.error('Error occurred while evaluating rate limit script:', err);
        res.status(500).send('Internal Server Error');
    }
}

app.use(rateLimiter);

app.get('/', (req, res) => {
    res.status(200).send('Welcome to the rate-limited API!');
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});