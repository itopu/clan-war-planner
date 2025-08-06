const trophyBadge = (trophies) => {
    if (trophies >= 5000) return "https://static.clashofclans.com/img/badges/league-legend.png";
    if (trophies >= 4700) return "https://static.clashofclans.com/img/badges/league-titan-1.png";
    if (trophies >= 4400) return "https://static.clashofclans.com/img/badges/league-titan-2.png";
    if (trophies >= 4100) return "https://static.clashofclans.com/img/badges/league-titan-3.png";
    if (trophies >= 3800) return "https://static.clashofclans.com/img/badges/league-champion-1.png";
    if (trophies >= 3500) return "https://static.clashofclans.com/img/badges/league-champion-2.png";
    if (trophies >= 3200) return "https://static.clashofclans.com/img/badges/league-champion-3.png";
    return "https://static.clashofclans.com/img/badges/league-crystal-3.png";
};

// Load api
$('#loadAPIBtn').on('click', () => {
    let apiUrl = $('#apiUrlInput').val().trim();

    if (!apiUrl) return alert('Please enter a URL.');

    // Encode the URL to be safe for query parameter
    let encodedUrl = encodeURIComponent(apiUrl);

    $.get(`/api/test?url=${apiUrl}`, (response) => {
        console.log('API Response:', response);
    }).fail((err) => {
        console.error('API Error:', err.responseJSON || err);
        alert('Failed to fetch data.');
    });
});



// Load and save clan tag
$('#loadClanBtn').on('click', () => {
    let tag = $('#clanTagInput').val().trim();
    if (!tag.startsWith('#')) tag = '#' + tag;

    if (!tag) return alert('Please enter a clan tag.');

    $.post('/api/clan', { tag }, () => {
        loadClanAndWar(); // auto load after save
    }).fail((err) => {
        alert('Error loading clan: ' + err.responseJSON?.error || 'Unknown error');
    });
});


$(document).ready(() => {
    loadClanAndWar();
});

async function loadClanAndWar() {
    try {
        const clan = await $.getJSON('/api/clan');
        $('#clanInfo').removeClass('hidden');
        $('#clanBadge').attr('src', clan.badgeUrls.medium);
        $('#clanName').text(clan.name);
        $('#clanLevel').text(`Level ${clan.clanLevel}`);

        // Check if CWL war is active
        let war = null;
        let isCWL = false;

        try {
            const league = await $.getJSON('/api/leaguegroup');
            const currentRound = league.rounds.find(r => r.warTags.includes('#0') === false); // Exclude empty warTags
            const activeWarTag = currentRound?.warTags.find(tag => tag && tag !== '#0');

            if (activeWarTag) {
                const encoded = encodeURIComponent(activeWarTag);
                war = await $.getJSON(`/api/cwlwar/${encoded}`);
                isCWL = true;
            }
        } catch (e) {
            console.warn('No active CWL war found, falling back to regular war.');
        }

        // If no CWL war found, fallback to currentwar
        if (!war) {
            war = await $.getJSON('/api/currentwar');
            isCWL = war.warType === 'cwl';
        }

        // --- UI Render ---
        $('#warInfo').removeClass('hidden');
        const warLabel = isCWL ? '📘 CWL Battle Day' : '🔥 Regular Clan War';

        $('#warType').text(warLabel);
        $('#opponentName').text(`vs ${war.opponent?.name || 'Unknown'}`);
        $('#opponentBadge').attr('src', war.opponent?.badgeUrls?.medium || '');

        const memberMap = {};
        (war.clan?.members || []).forEach((m) => {
            memberMap[m.tag] = {
                name: m.name,
                warBase: m.mapPosition,
            };
        });

        const enemyMembers = war.opponent?.members || [];
        const enemyOptions = enemyMembers
            .map((e, idx) => {
                const name = e.name || 'Enemy';
                const th = e.townhallLevel || '?';
                return `<option value="${idx + 1}">#${idx + 1} - ${name} (TH${th})</option>`;
            })
            .join('');

        const tableBody = $('#plannerTableBody').empty();

        (clan.memberList || []).forEach((member) => {
            const warData = memberMap[member.tag] || {};
            const trophy = member.trophies || 0;
            const badge = trophyBadge(trophy);
            const warBase = warData.warBase || '-';

            const row = `
                <tr>
                    <td class="border px-2 py-1">${member.name}</td>
                    <td class="border px-2 py-1 text-center">
                        <img src="${badge}" class="w-6 h-6 inline-block" />
                        <div class="text-xs">${trophy}</div>
                    </td>
                    <td class="border px-2 py-1 text-center">${warBase}</td>
                    <td class="border px-2 py-1">
                        <select class="w-full border rounded px-1 py-0.5">${enemyOptions}</select>
                    </td>
                    <td class="border px-2 py-1">
                        <input type="text" class="w-full border rounded px-2 py-1 text-sm" placeholder="Note 1">
                    </td>
                    ${isCWL
                    ? '<td class="border px-2 py-1 text-center text-gray-400">—</td>'
                    : `<td class="border px-2 py-1">
                                <input type="text" class="w-full border rounded px-2 py-1 text-sm" placeholder="Note 2">
                               </td>`
                }
                </tr>
            `;
            tableBody.append(row);
        });

        $('#plannerWrapper').removeClass('hidden');

    } catch (err) {
        console.error("❌ Error loading data:", err);
        alert('Failed to load war planner data. See console for details.');
    }
}

