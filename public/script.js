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

// Load and save clan tag
$('#loadClanBtn').on('click', () => {
  const tag = $('#clanTagInput').val().trim();
  if (!tag) return alert('Please enter a clan tag.');

  $.post('/api/clan', { tag }, () => {
    loadClanAndWar(); // auto load after save
  }).fail((err) => {
    alert('Error loading clan: ' + err.responseJSON?.error);
  });
});

$(document).ready(() => {
  loadClanAndWar();
});

function loadClanAndWar() {
  $.getJSON('/api/clan', (clan) => {
    $('#clanInfo').removeClass('hidden');
    $('#clanBadge').attr('src', clan.badgeUrls.medium);
    $('#clanName').text(clan.name);
    $('#clanLevel').text(`Level ${clan.clanLevel}`);

    $.getJSON('/api/currentwar', (war) => {
      $('#warInfo').removeClass('hidden');
      const isCWL = war.warType === 'cwl';
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
            ${
              isCWL
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
    });
  });
}
