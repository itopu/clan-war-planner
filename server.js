import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;
const API_TOKEN = process.env.API_TOKEN;
const CLAN_TAG = process.env.CLAN_TAG;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const HEADERS = { Authorization: `Bearer ${API_TOKEN}` };

// Utility to save JSON files
const saveFile = (filename, data) => {
    fs.writeFileSync(`public/${filename}`, JSON.stringify(data, null, 2));
};

// Get Clan Info
app.get('/api/auto-load', async (req, res) => {
    try {
        const encodedTag = encodeURIComponent(CLAN_TAG);
        const clanRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}`, { headers: HEADERS });
        const clan = await clanRes.json();
        saveFile('my_clan.json', clan);

        const warRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`, { headers: HEADERS });
        const war = await warRes.json();

        // If normal war is not active, try CWL
        if (war.state === 'notInWar' && clan.warLeague) {
            const leagueRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar/leaguegroup`, { headers: HEADERS });
            const leagueGroup = await leagueRes.json();

            const currentRound = leagueGroup.rounds?.find(r => r.warTags.some(w => w !== '#0'));
            const currentTag = currentRound?.warTags?.find(tag => tag !== '#0');

            if (currentTag) {
                const cwlWarRes = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(currentTag)}`, { headers: HEADERS });
                const cwlWar = await cwlWarRes.json();
                saveFile('current_war.json', cwlWar);
                return res.json({ type: 'cwl', data: cwlWar });
            } else {
                return res.status(404).json({ error: 'No active CWL war found.' });
            }
        } else {
            saveFile('current_war.json', war);
            return res.json({ type: 'normal', data: war });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// Save strategy
app.post('/api/strategy', (req, res) => {
    saveFile('attack_strategy.json', req.body);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

app.get('/myip', async (req, res) => {
  const ipResponse = await fetch('https://api64.ipify.org?format=json');
  const ipData = await ipResponse.json();
  res.json(ipData);
});