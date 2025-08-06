const trophyBadge = (trophies) => {
    if (trophies >= 5000) return "/images/legend_league.webp";                  // Legend
    if (trophies >= 4400 && trophies <= 4999) return "/images/titan.webp";      // Titan I–III
    if (trophies >= 3800 && trophies <= 4399) return "/images/champion.webp";   // Champion I–III
    if (trophies >= 3200 && trophies <= 3799) return "/images/master.webp";     // Master I–III
    if (trophies >= 2600 && trophies <= 3199) return "/images/crystal.webp";    // Crystal I–III
    if (trophies >= 1800 && trophies <= 2599) return "/images/gold.webp";       // Gold I–III
    if (trophies >= 1000 && trophies <= 1799) return "/images/silver.webp";     // Silver I–III
    if (trophies >= 100 && trophies <= 999) return "/images/bronze.webp";       // Bronze I–III
    return "/images/unranked.webp";                                             // Unranked
};

$(document).ready(async function () {
    const clanInfo = $('#clanInfo');
    const warInfo = $('#warInfo');
    const plannerWrapper = $('#plannerWrapper');
    const plannerTableBody = $('#plannerTableBody');

    async function loadEverything() {
        clanInfo.addClass('hidden');
        warInfo.addClass('hidden');
        plannerWrapper.addClass('hidden');
        plannerTableBody.empty();

        try {
            // ✅ Load clan info from .env tag (via backend)
            const clanRes = await $.getJSON('/api/clan');
            displayClan(clanRes.clan);

            // ✅ Load war info
            const warRes = await $.getJSON('/api/currentwar');
            displayWar(warRes.type, warRes.data);

            // ✅ Detect which side is our clan
            const myTag = clanRes.clan.tag;
            const isMyClan = warRes.data.clan.tag === myTag;
            const myClan = isMyClan ? warRes.data.clan : warRes.data.opponent;
            const enemyClan = isMyClan ? warRes.data.opponent : warRes.data.clan;

            // ✅ Load strategy (fallback to [])
            let attackPlan = [];
            try {
                const data = await $.getJSON('/api/attack-strategy');
                if (Array.isArray(data)) {
                    attackPlan = data;
                }
            } catch (err) {
                console.warn('No previous attack plan found. Starting fresh.');
                attackPlan = [];
            }

            // ✅ Build planner
            const members = normalizeBaseOrder(myClan.members || []);
            const enemies = normalizeBaseOrder(enemyClan.members || []);

            buildPlannerTable(members, enemies, warRes.data, attackPlan, warRes.type);
        } catch (err) {
            alert('Failed to auto load data.');
            console.error(err);
        }
    }

    function displayClan(clan) {
        $('#clanBadge').attr('src', clan.badgeUrls.medium);
        $('#clanName').text(clan.name);
        $('#clanLevel').text(`Level ${clan.clanLevel}`);
        clanInfo.removeClass('hidden');
    }

    function displayWar(type, warData) {
        $('#warType').text(type === 'cwl' ? 'Clan War League' : 'Regular War');
        $('#opponentName').text(warData.opponent.name || 'Unknown');
        $('#opponentBadge').attr('src', warData.opponent.badgeUrls.medium);
        warInfo.removeClass('hidden');
    }

    function normalizeBaseOrder(members) {
        return members
            .filter(m => typeof m.mapPosition === 'number')
            .sort((a, b) => a.mapPosition - b.mapPosition) // sort by actual base number
            .map((m, i) => {
                return { ...m, normalizedPosition: i + 1 }; // assign 1-based serial
            });
    }

    function buildPlannerTable(members, enemyClan, warData, plan, warType) {
        members.forEach(member => {
            const existingPlan = plan.find(p => p.tag === member.tag) || {};

            let attackInfo = '—';
            if (member.attacks?.length > 0) {
                const a = member.attacks[0]; // CWL or first attack
                attackInfo = `${'⭐'.repeat(a.stars)} (${a.destructionPercentage}%)`;
            }

            const playerRow = `
                <tr class="border">
                    <td class="p-2 border">${member.name}</td>
                    <td class="p-2 border">${member.trophies || '-'}</td>
                    <td class="p-2 border">${member.normalizedPosition || '-'}</td>
                    <td class="p-2 border">${attackInfo || '-'}</td>
                    <td class="p-2 border">
                        <select class="enemy-select w-full border rounded px-1 py-1" data-tag="${member.tag}">
                            <option value="">Select</option>
                            ${generateEnemyOptions(enemyClan)}
                        </select>
                    </td>
                    <td class="p-2 border">
                        <input type="text" class="note-1 w-full border rounded px-1 py-1" data-tag="${member.tag}" value="${existingPlan.note1 || ''}" />
                    </td>
                    <td class="p-2 border">
                        <input type="text" class="note-2 w-full border rounded px-1 py-1" data-tag="${member.tag}" value="${existingPlan.note2 || ''}" />
                    </td>
                </tr>
            `;
            plannerTableBody.append(playerRow);

            if (existingPlan.enemyBase)
                $(`.enemy-select[data-tag="${member.tag}"]`).val(existingPlan.enemyBase);
        });

        plannerWrapper.removeClass('hidden');

        $('.enemy-select, .note-1, .note-2').on('change', saveStrategy);
    }

    function generateEnemyOptions(enemyClanMembers) {
        if (!enemyClanMembers) return '';

        return enemyClanMembers
            .filter(e => typeof e.normalizedPosition === 'number')
            .sort((a, b) => a.normalizedPosition - b.normalizedPosition)
            .map(e =>
                `<option value="${e.mapPosition}">${e.normalizedPosition}. ${e.name} (TH${e.townhallLevel})</option>`
            )
            .join('');
    }

    async function saveStrategy() {
        const data = [];

        $('#plannerTableBody tr').each(function () {
            const tag = $(this).find('select, input').first().data('tag');
            const enemyBase = $(this).find('.enemy-select').val();
            const note1 = $(this).find('.note-1').val();
            const note2 = $(this).find('.note-2').val();

            data.push({ tag, enemyBase, note1, note2 });
        });

        try {
            await $.post('/api/attack-strategy', data);
        } catch (err) {
            console.error('Failed to save strategy', err);
        }
    }

    // 🔁 Auto-load everything on page ready
    loadEverything();
});