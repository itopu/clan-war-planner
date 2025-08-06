async function loadClanAndWar() {
    try {
        const res = await $.get('/api/auto-load');
        const warData = res.data;
        const isCWL = res.type === 'cwl';

        $('#clan-info').html(`<p><strong>Type:</strong> ${isCWL ? '🏅 CWL War' : '⚔️ Normal War'}</p>
      <p><strong>Opponent:</strong> ${warData.opponent?.name || 'Unknown'}</p>`);

        const attackMap = {}; // store strategy data

        const members = warData.clan.members;
        const opponents = warData.opponent.members;

        let rows = '';
        members.forEach((member, idx) => {
            const playerTag = member.tag;
            const enemyBase = opponents[idx] || {};
            const trophy = member.expLevel;

            const baseId = idx + 1;
            const atk1 = '';
            const atk2 = isCWL ? 'N/A' : '';
            const note = '';
            const stars = '';
            const percent = '';

            attackMap[playerTag] = {
                base: baseId,
                atk1, atk2,
                note,
                stars, percent
            };

            rows += `<tr>
        <td class="p-2">${member.name} <span class="text-xs text-gray-400">(${trophy}🏆)</span></td>
        <td class="p-2"><input value="${baseId}" data-tag="${playerTag}" class="base bg-gray-700 px-2 py-1 w-16 rounded"/></td>
        <td class="p-2"><input type="checkbox" class="atk1" data-tag="${playerTag}"/></td>
        <td class="p-2">${isCWL ? 'N/A' : `<input type="checkbox" class="atk2" data-tag="${playerTag}"/>`}</td>
        <td class="p-2"><input class="note bg-gray-700 px-2 py-1 w-full rounded" data-tag="${playerTag}" placeholder="strategy"/></td>
        <td class="p-2"><input class="star bg-gray-700 w-12 px-1 rounded" data-tag="${playerTag}" /></td>
        <td class="p-2"><input class="percent bg-gray-700 w-12 px-1 rounded" data-tag="${playerTag}" /></td>
      </tr>`;
        });

        $('#war-table').html(rows);

        $('#save-strategy').on('click', () => {
            const plan = {};
            $('input.base').each(function () {
                const tag = $(this).data('tag');
                plan[tag] = {
                    base: $(this).val(),
                    atk1: $(`.atk1[data-tag='${tag}']`).prop('checked'),
                    atk2: $(`.atk2[data-tag='${tag}']`).prop('checked'),
                    note: $(`.note[data-tag='${tag}']`).val(),
                    stars: $(`.star[data-tag='${tag}']`).val(),
                    percent: $(`.percent[data-tag='${tag}']`).val(),
                };
            });

            $.post('/api/strategy', JSON.stringify(plan), null, 'json')
                .done(() => alert('✅ Strategy saved'))
                .fail(() => alert('❌ Failed to save strategy'));
        });

    } catch (err) {
        console.error(err);
        alert('❌ Error loading war data');
    }
}

$(document).ready(() => {
    loadClanAndWar();
});
