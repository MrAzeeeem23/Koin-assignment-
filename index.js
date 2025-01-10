const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const schedule = require("node-schedule");
const PORT = 3000;

//Task 1
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://azeemkhanbeing:MafiaKH12@coinex.lnvet.mongodb.net/?retryWrites=true&w=majority&appName=CoinEx');
        console.log("Mongodb connected")
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message)

        process.exit(1)
    }
};

connectDB();

const app = express();
app.use(express.json());

const cryptoSchema = new mongoose.Schema({
    coin: String,
    price: Number,
    marketCap: Number,
    change24h: Number,
    fetchedAt: { type: Date, default: Date.now },
});
const Crypto = mongoose.model("Crypto", cryptoSchema);

const fetchAndStoreCryptoData = async () => {
    const coins = ["bitcoin", "matic-network", "ethereum"];
    try {
        const { data } = await axios.get(
            `https://api.coingecko.com/api/v3/simple/price`,
            {
              params: {
                ids: coins.join(','),
                vs_currencies: 'usd',
                include_market_cap: true,
                include_24hr_change: true,
              },
            }
          );

        for (const coin of coins) {
            await Crypto.create({
                coin,
                price: data[coin].usd,
                marketCap: data[coin].usd_market_cap,
                change24h: data[coin].usd_24h_change,
            });
        }
        console.log("data fetched and stored successfullly")
    } catch (error) {
        console.error("Error in fetching ", error.message)
    }
};
// schedulejob 2h
schedule.scheduleJob("0 */2 * * *", fetchAndStoreCryptoData);
// schedule.scheduleJob("*/5 * * * * *", fetchAndStoreCryptoData); // testing

app.get("/stats", async (req, res) => {

    const { coin } = req.query;
    if (!coin) {
        return res.status(400)
            .json({ error: "coin parapeter is requires" });
    }

    try {
        const data = await Crypto.findOne({ coin }).sort({ fetchedAt: -1 })
        if (!data) {

            return res.status(404)
                .json({ error: `No data found for coin: ${coin}` })

        }

        res.json({
            price: data.price,
            marketCap: data.marketCap,
            "24hChange": data.change24h,
        })
    }
    catch (error) {

        res.status(500).json({ error: "Internal server Error" })
    }
});

app.get("/deviation", async (req, res) => {


    const { coin } = req.query;

    if (!coin) {
        return res
            .status(400)
            .json({ error: "coin parapeter is requires" });
    }

    try {
        const records = await Crypto.find({ coin })
            .sort({ fetchedAt: -1 })
            .limit(100);

        if (records.length === 0) {
            return res
                .status(404)
                .json({ error: `no coin found: ${coin}` })
        }

        const prices = records.map((record) => record.price)

        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;

        const deviation = Math.sqrt(variance)

        res.json({ deviation: deviation.toFixed(2) })
    } catch (error) {
        res.status(500).json({ error: "internal server error" })
    }
});

 app.listen(PORT, () => {
    console.log(`Server URL http://localhost:${PORT}`);

});
