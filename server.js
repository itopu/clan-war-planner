// ✅ server.js (updated with routes as per your instruction)
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

const CLAN_FILE = path.join(__dirname, 'data', 'my_clan.json');
const WAR_FILE = path.join(__dirname, 'data', 'current_war.json');
const ATTACK_STRATEGY = path.join(__dirname, 'data', 'attack_strategy.json');

const fetchFromClash = async (url) => {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.COC_API_TOKEN}`
        }
    });
    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
    return await response.json();
};

app.get('/api/clan', async (req, res) => {
    const encodedTag = encodeURIComponent(process.env.CLAN_TAG);
    try {
        const clan = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}`);
        const members = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/members`);
        fs.writeFileSync(CLAN_FILE, JSON.stringify({ clan, members }, null, 2));
        res.json({ clan, members });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/currentwar', async (req, res) => {
    const encodedTag = encodeURIComponent(process.env.CLAN_TAG);

    try {
        const leagueGroup = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar/leaguegroup`);

        const allWarTags = leagueGroup.rounds
            .flatMap(round => round.warTags)
            .filter(tag => tag && tag !== '#0');

        for (const tag of allWarTags) {
            const warTag = encodeURIComponent(tag);
            const cwlWar = await fetchFromClash(`https://api.clashofclans.com/v1/clanwarleagues/wars/${warTag}`);

            const clanTag = process.env.CLAN_TAG;

            if (
                (cwlWar?.clan?.tag === clanTag || cwlWar?.opponent?.tag === clanTag) &&
                cwlWar.state !== 'warEnded'
            ) {
                // 🔁 Swap if our clan is in opponent slot
                if (cwlWar.opponent?.tag === clanTag) {
                    const temp = cwlWar.clan;
                    cwlWar.clan = cwlWar.opponent;
                    cwlWar.opponent = temp;
                }

                // ✅ Save the correctly oriented war data
                fs.writeFileSync(WAR_FILE, JSON.stringify(cwlWar, null, 2));
                return res.json({
                    type: 'cwl',
                    data: cwlWar,
                    
                    warTag: tag, // Just warTag string
                    leagueGroup
                });
            }
        }
    } catch (err) {
        console.log('CWL fetch failed or not found. Falling back to regular war...');
    }

    // fallback to regular war if not CWL
    try {
        const regularWar = await fetchFromClash(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`);
        fs.writeFileSync(WAR_FILE, JSON.stringify(regularWar, null, 2));
        res.json({ type: 'regular', data: regularWar });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/attack-strategy', (req, res) => {
    try {
        fs.writeFileSync(ATTACK_STRATEGY, JSON.stringify(req.body, null, 2));
        res.json({ message: 'Saved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save' });
    }
});

app.get('/api/attack-strategy', (req, res) => {
    try {
        const data = fs.existsSync(ATTACK_STRATEGY) ? fs.readFileSync(ATTACK_STRATEGY) : '[]';
        res.json(JSON.parse(data));
    } catch (err) {
        res.status(500).json({ error: 'Failed to load strategy' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.get('/myip', async (req, res) => {
    const ipResponse = await fetch('https://api64.ipify.org?format=json');
    const ipData = await ipResponse.json();
    res.json(ipData);
});