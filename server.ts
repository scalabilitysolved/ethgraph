import express from 'express';
import {run, EthereumAddress} from './main';
import {createClient} from 'redis';
import morgan from 'morgan';


const redisClient = createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();


const app = express();
app.use(morgan('dev'));
const port = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/recent-addresses', async (req, res) => {
    try {
        // Fetch the last 5 addresses from Redis
        const recentAddresses = await redisClient.lRange('recent-addresses', 0, 4);
        res.json(recentAddresses);
    } catch (error) {
        console.error('Error in requesting recent address:', error);
        res.status(500).json({error: 'Internal Server Error', message: error});
    }
});


app.get('/data', async (req, res) => {
    const address = req.query.address as string;
    let depth = parseInt(req.query.depth as string); // Parse depth as integer
    if (isNaN(depth) || depth < 1 || depth > 5) {
        depth = 2;
    }
    if (!address) {
        res.status(400).json({error: 'Ethereum address is required'});
        return;
    }

    try {
        const cacheKey = `${address}-${depth}`;
        let cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log('Cache hit for key:', cacheKey);
            res.json(JSON.parse(cachedData));
        } else {
            const accountRelationship = await run(address.toString(), depth);
            await redisClient.setEx(cacheKey, 86400, JSON.stringify(accountRelationship));

            // Store the address in the recent list
            await redisClient.lPush('recent-addresses', address);
            await redisClient.lTrim('recent-addresses', 0, 4);
            console.log('Set cache for key:', cacheKey);
            res.json(accountRelationship);
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({error: 'Internal Server Error', message: error});
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
