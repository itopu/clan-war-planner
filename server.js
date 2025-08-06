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

const HEADERS = {
    Authorization: `Bearer ${API_TOKEN}`,
    Accept: 'application/json'
};

// Utility to save JSON files
const saveFile = (filename, data) => {
    fs.writeFileSync(`public/${filename}`, JSON.stringify(data, null, 2));
};

// Get Clan Info
app.get('/api/auto-load', async (req, res) => {
    try {
        const encodedTag = encodeURIComponent(CLAN_TAG);
        console.log("🔄 Fetching clan info...");

        const clanRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}`, { headers: HEADERS });
        const clan = await clanRes.json();

        if (clan.reason) {
            const errorObj = {
                step: 'clan',
                error: true,
                details: clan
            };
            console.error("❌ Error at step:", errorObj.step, "| Message:", clan.message);
            return res.status(403).json(errorObj);
        }

        saveFile('my_clan.json', clan);
        console.log("✅ Clan info loaded & saved");

        console.log("🔄 Fetching current war...");
        const warRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar`, { headers: HEADERS });
        const war = await warRes.json();

        if (war.reason) {
            const errorObj = {
                step: 'war',
                error: true,
                details: war
            };
            console.error("❌ Error at step:", errorObj.step, "| Message:", war.message);
            return res.status(403).json(errorObj);
        }

        if (war.state === 'notInWar' && clan.warLeague) {
            console.log("⚔️ Not in normal war, checking CWL...");

            const leagueRes = await fetch(`https://api.clashofclans.com/v1/clans/${encodedTag}/currentwar/leaguegroup`, { headers: HEADERS });
            const leagueGroup = await leagueRes.json();

            if (leagueGroup.reason) {
                const errorObj = {
                    step: 'cwl_group',
                    error: true,
                    details: leagueGroup
                };
                console.error("❌ Error at step:", errorObj.step, "| Message:", leagueGroup.message);
                return res.status(403).json(errorObj);
            }

            const currentRound = leagueGroup.rounds?.find(r => r.warTags.some(w => w !== '#0'));
            const currentTag = currentRound?.warTags?.find(tag => tag !== '#0');

            if (!currentTag) {
                const errorObj = {
                    step: 'cwl_tag',
                    error: true,
                    message: 'No active CWL war tag found.'
                };
                console.warn("⚠️", errorObj.message);
                return res.status(404).json(errorObj);
            }

            const cwlWarRes = await fetch(`https://api.clashofclans.com/v1/clanwarleagues/wars/${encodeURIComponent(currentTag)}`, { headers: HEADERS });
            const cwlWar = await cwlWarRes.json();

            if (cwlWar.reason) {
                const errorObj = {
                    step: 'cwl_war',
                    error: true,
                    details: cwlWar
                };
                console.error("❌ Error at step:", errorObj.step, "| Message:", cwlWar.message);
                return res.status(403).json(errorObj);
            }

            saveFile('current_war.json', cwlWar);
            console.log("✅ CWL war data loaded & saved");
            return res.json({ type: 'cwl', data: cwlWar });
        } else {
            saveFile('current_war.json', war);
            console.log("✅ Normal war data loaded & saved");
            return res.json({ type: 'normal', data: war });
        }

    } catch (err) {
        const errorObj = {
            step: 'unexpected',
            error: true,
            message: err.message,
            stack: err.stack
        };
        console.error("💥 Unexpected error:", err.message);
        return res.status(500).json(errorObj);
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