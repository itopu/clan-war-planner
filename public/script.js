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

$(document).ready(function () {
    const clanInfo = $('#clanInfo');
    const warInfo = $('#warInfo');
    const plannerWrapper = $('#plannerWrapper');
    const plannerTableBody = $('#plannerTableBody');

    $('#loadClanBtn').click(async () => {
        const tag = $('#clanTagInput').val().trim();
        if (!tag) return alert('Please enter a Clan Tag.');

        clanInfo.addClass('hidden');
        warInfo.addClass('hidden');
        plannerWrapper.addClass('hidden');
        plannerTableBody.empty();

        try {
            // Load clan info
            const clanRes = await $.get('/api/clan');
            displayClan(clanRes.clan);

            // Load war info (CWL or regular)
            const warRes = await $.get('/api/currentwar');
            displayWar(warRes.type, warRes.data);

            // Load planner
            const members = clanRes.members.items;
            const enemyClan = warRes.data.opponent;
            const attackPlan = await $.get('/api/attack-strategy');

            buildPlannerTable(members, enemyClan, warRes.data, attackPlan);
        } catch (err) {
            alert('Failed to load data.');
            console.error(err);
        }
    });

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

    function buildPlannerTable(members, enemyClan, warData, plan) {
        members.forEach(member => {
            const existingPlan = plan.find(p => p.tag === member.tag) || {};
            const playerRow = `
                <tr class="border">
                    <td class="p-2 border">${member.name}</td>
                    <td class="p-2 border">${member.trophies}</td>
                    <td class="p-2 border">${member.mapPosition || '-'}</td>
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

    function generateEnemyOptions(enemyClan) {
        if (!enemyClan?.members) return '';
        return enemyClan.members.map((e, i) =>
            `<option value="${i + 1}">${i + 1}. ${e.name} (TH${e.townhallLevel})</option>`
        ).join('');
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
});
