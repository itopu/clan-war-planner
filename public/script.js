$('#fetchClanMembers').click(function () {
  const tag = $('#clanTag').val().trim().replace('#', '%23');
  if (!tag) return alert('Please enter a clan tag.');

  $.getJSON(`/api/clan/${tag}`, function (response) {
    const members = response.memberList;
    const $memberList = $('#memberList').empty();

    members.forEach(member => {
      const name = member.name;
      const id = `chk_${name.replace(/\s+/g, '_')}`;
      $memberList.append(`
        <label class="inline-flex items-center">
          <input type="checkbox" id="${id}" class="mr-2" value="${name}" />
          ${name} (${member.trophies} 🏆)
        </label>
      `);
    });

    $('#warMemberSelector').removeClass('hidden');
  }).fail(() => {
    alert('Clan not found or server error. Check token or clan tag.');
  });
});

$('#generatePlanner').click(function () {
  const selected = [];
  $('#memberList input[type="checkbox"]:checked').each(function () {
    selected.push($(this).val());
  });

  if (selected.length === 0) return alert('Select at least one war member.');

  const $tbody = $('#plannerTableBody').empty();
  selected.forEach(name => {
    $tbody.append(`
      <tr>
        <td class="border p-2">${name}</td>
        <td class="border p-2"><input type="text" class="w-full border px-2 py-1" placeholder="#" /></td>
        <td class="border p-2 text-center"><input type="checkbox" /></td>
        <td class="border p-2 text-center"><input type="checkbox" /></td>
        <td class="border p-2"><input type="text" class="w-full border px-2 py-1" placeholder="Strategy / Notes" /></td>
      </tr>
    `);
  });

  $('#plannerTableWrapper').removeClass('hidden');
});
