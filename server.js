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

// 🔹 Fetch and save current war (CWL-aware)
app.get('/api/currentwar', async (req, res) => {
    try {
        const data = fs.readFileSync(CLAN_FILE, 'utf8');
        const clan = JSON.parse(data);
        const encodedTag = encodeURIComponent(clan.tag);

        const leagueGroup = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar/leaguegroup`);
        
        console.log(leagueGroup);
        
        const currentWar = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`);

        // If CWL war is active, currentWar will show warType = 'cwl'
        if (currentWar.warType === 'cwl') {
            // Load league group
            const leagueGroup = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar/leaguegroup`);

            // Find current round (first not ended war)
            const currentRound = leagueGroup.rounds
                .flat()
                .find(round => !round.warEnded);

            if (!currentRound) throw new Error('No active CWL round found.');

            const warTag = encodeURIComponent(currentRound.warTags[0]); // first battle of the round
            const cwlWar = await fetchFromClash(`https://api.clashofclans.com/v1/clanwarleagues/wars/${warTag}`);

            // Save and return
            fs.writeFileSync(WAR_FILE, JSON.stringify(cwlWar, null, 2));
            return res.json(cwlWar);
        }

        // Not CWL — save and return normal war
        fs.writeFileSync(WAR_FILE, JSON.stringify(currentWar, null, 2));
        res.json(currentWar);
    } catch (err) {
        console.error('❌ Error in /api/currentwar:', err.message);
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

app.get('/myip', async (req, res) => {
  const ipResponse = await fetch('https://api64.ipify.org?format=json');
  const ipData = await ipResponse.json();
  res.json(ipData);
});