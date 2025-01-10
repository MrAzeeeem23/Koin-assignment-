const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');


mongoose.connect('mongodb+srv://azeemkhanbeing:MafiaKH12@coinex.lnvet.mongodb.net/?retryWrites=true&w=majority&appName=CoinEx')
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to the database.');
});

const cryptoSchema = new mongoose.Schema({
  coin: String,
  price: Number,
  marketCap: Number,
  change24h: Number,
  fetchedAt: { type: Date, default: Date.now },
});

const Crypto = mongoose.model('Crypto', cryptoSchema);

const fetchCryptoData = async () => {
  try {
    const ids = 'bitcoin,matic-network,ethereum';
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`;
    const response = await axios.get(url);

    const data = response.data;

    const cryptos = Object.entries(data).map(([coin, details]) => ({
      coin,
      price: details.usd,
      marketCap: details.usd_market_cap,
      change24h: details.usd_24h_change,
    }));

    // Save data to the database
    for (const crypto of cryptos) {
      const newEntry = new Crypto(crypto);
      await newEntry.save();
    }

    console.log('Crypto data fetched and saved:', cryptos);
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
};

// Schedule the Job
cron.schedule('0 */2 * * *', () => {
  console.log('Running scheduled job: Fetch crypto data');
  fetchCryptoData();
});

// Run the job immediately on startup
fetchCryptoData();
