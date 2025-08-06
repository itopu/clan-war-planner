// server.js
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// File paths
const CLAN_FILE = path.join(__dirname, 'public', 'my_clan.json');
const WAR_FILE = path.join(__dirname, 'public', 'current_war.json');

// 🔹 Helper function to fetch from COC API
const fetchFromClash = async (url) => {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.COC_API_TOKEN}`
        }
    });

    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    return await response.json();
};

// 🔹 Fetch and save clan info
app.post('/api/clan', async (req, res) => {
    const { tag } = req.body;
    console.log('Received tag:', tag);
    
    if (!tag) return res.status(400).json({ error: 'Clan tag required' });

    try {
        const encodedTag = encodeURIComponent(tag);
        const clan = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}`);
        const members = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/members`);

        const combined = { ...clan, memberList: members.items };
        fs.writeFileSync(CLAN_FILE, JSON.stringify(combined, null, 2));

        res.json({ message: 'Clan data saved', clan: combined });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Fetch and save current war
app.get('/api/currentwar', async (req, res) => {
    try {
        const data = fs.readFileSync(CLAN_FILE, 'utf8');
        const clan = JSON.parse(data);

        const encodedTag = encodeURIComponent(clan.tag);
        const war = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`);

        fs.writeFileSync(WAR_FILE, JSON.stringify(war, null, 2));
        res.json(war);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 Load saved clan from file
app.get('/api/clan', (req, res) => {
    try {
        const data = fs.readFileSync(CLAN_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Clan file not found' });
    }
});

// 🔹 Load saved war from file
app.get('/api/war', (req, res) => {
    try {
        const data = fs.readFileSync(WAR_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'War file not found' });
    }
});

app.listen(PORT, () => {
    console.log(`🟢 Server is running at http://localhost:${PORT}`);
});
