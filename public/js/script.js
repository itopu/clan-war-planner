function isOdd(num) { return num % 2; }

const townHalls = (th, destructed = false) => {
    if (th == 17) return `images/town_hall/${destructed ? 'destroyed_' : ''}17.webp`;
    if (th == 16) return `images/town_hall/${destructed ? 'destroyed_' : ''}16.webp`;
    if (th == 15) return `images/town_hall/${destructed ? 'destroyed_' : ''}15.webp`;
    if (th == 14) return `images/town_hall/${destructed ? 'destroyed_' : ''}14.webp`;
    if (th == 13) return `images/town_hall/${destructed ? 'destroyed_' : ''}13.webp`;
    if (th == 12) return `images/town_hall/${destructed ? 'destroyed_' : ''}12.webp`;
    if (th == 11) return `images/town_hall/${destructed ? 'destroyed_' : ''}11.webp`;
    if (th == 10) return `images/town_hall/${destructed ? 'destroyed_' : ''}10.webp`;
    if (th == 9) return `images/town_hall/${destructed ? 'destroyed_' : ''}9.webp`;
    if (th == 8) return `images/town_hall/${destructed ? 'destroyed_' : ''}8.webp`;
    if (th == 7) return `images/town_hall/${destructed ? 'destroyed_' : ''}7.webp`;
    if (th == 6) return `images/town_hall/${destructed ? 'destroyed_' : ''}6.webp`;
    if (th == 5) return `images/town_hall/${destructed ? 'destroyed_' : ''}5.webp`;
    if (th == 4) return `images/town_hall/${destructed ? 'destroyed_' : ''}4.webp`;
    if (th == 3) return `images/town_hall/${destructed ? 'destroyed_' : ''}3.webp`;
    if (th == 2) return `images/town_hall/${destructed ? 'destroyed_' : ''}2.webp`;
    return `images/town_hall/${destructed ? 'destroyed_' : ''}1.webp`;
};

const trophyBadge = (trophies) => {
    if (trophies >= 4900) return "images/legend_league.webp";                  // Legend
    if (trophies >= 4400 && trophies <= 4899) return "images/titan.webp";      // Titan I–III
    if (trophies >= 3800 && trophies <= 4399) return "images/champion.webp";   // Champion I–III
    if (trophies >= 3200 && trophies <= 3799) return "images/master.webp";     // Master I–III
    if (trophies >= 2600 && trophies <= 3199) return "images/crystal.webp";    // Crystal I–III
    if (trophies >= 1800 && trophies <= 2599) return "images/gold.webp";       // Gold I–III
    if (trophies >= 1000 && trophies <= 1799) return "images/silver.webp";     // Silver I–III
    if (trophies >= 100 && trophies <= 999) return "images/bronze.webp";       // Bronze I–III
    return "images/unranked.webp";                                             // Unranked
};

const elements = {
    myClanInfo: $('#my-clan-info'),
    centerInfo: $('#center-info'),
    oponentClanInfo: $('#oponent-clan-info'),
    warType: $('#war-type'),
    warTypeContainer: $('#war-type-container'),

    warBaseContainer: $('#war-bases-container'),
    warBaseMyClanMembersContainer: $('#my-clan-member-list-container'),
    warBaseOponentClanMembersContainer: $('#oponent-clan-member-list-container'),

    // my-clan
    myClan: {
        badge: $('#my-clan-badge'),
        name: $('#my-clan-name'),
        tag: $('#my-clan-tag'),
        totalAtkCountDetails: $("#my-clan-total-atk-count-details"),
        totalStar: $("#my-clan-total-stars"),
        totalStarPercentage: $("#my-clan-total-star-percentage"),
    },
    // my-clan

    warTimer: $("#war-timer-element"),
    warTimerLabel: $("#war-timer-label"),

    // oponent-clan
    oponentClan: {
        badge: $('#oponent-clan-badge'),
        name: $('#oponent-clan-name'),
        tag: $('#oponent-clan-tag'),
        totalAtkCountDetails: $("#oponent-clan-total-atk-count-details"),
        totalStar: $("#oponent-clan-total-stars"),
        totalStarPercentage: $("#oponent-clan-total-star-percentage"),
    },
    // oponent-clan
};

$(function () {
    async function loadEverything() {
        elements.centerInfo.addClass('hidden');
        elements.oponentClanInfo.addClass('hidden');
        elements.warBaseContainer.addClass('hidden');
        elements.warTypeContainer.addClass('hidden');

        try {
            // ---- Parallel fetch (production) ----
            const [clanRes, warRes, strategy] = await Promise.all([
                $.getJSON('/api/clan'),
                $.getJSON('/api/currentwar'),
                $.getJSON('/api/attack-strategy')
            ]);

            // ---- Dev/static fallback (now) ----
            // const [clanRes, warRes, strategy] = await Promise.all([
            //     Promise.resolve(clanObject),
            //     Promise.resolve(currentWarObject),
            //     Promise.resolve(attackStrategyObject),
            // ]);

            // ---- All data is ready here ----
            // Render top panels
            displayClan(clanRes.clan);
            displayWar(warRes.type, warRes.data);

            if (warRes.data.state != "notInWar") {
                // Figure out my clan vs enemy
                const myTag = clanRes.clan.tag;
                const isMyClan = warRes.data.clan.tag === myTag;
                const myClan = isMyClan ? warRes.data.clan : warRes.data.opponent;
                const enemy = isMyClan ? warRes.data.opponent : warRes.data.clan;

                // Attach trophies, normalize orders
                const updatedMyClan = attachTrophiesToMyClan(myClan, clanRes);
                const members = normalizeBaseOrder(updatedMyClan.members || []);
                const enemies = normalizeBaseOrder(enemy.members || []);

                // ✅ Call AFTER everything is loaded
                buildPlannerTable(members, enemies, warRes.data);

                // finally unhide UI sections as needed
                elements.centerInfo.removeClass('hidden');
                elements.oponentClanInfo.removeClass('hidden');
                elements.warBaseContainer.removeClass('hidden');
                elements.warTypeContainer.removeClass('hidden');

                loadDragEverything(members, enemies, warRes.data, strategy);
            }
        } catch (err) {
            console.log(err);
            console.error("loadEverything failed:", err);
            // optional: show a toast/UI error
        }
    }

    function displayClan(clan) {
        elements.myClan.badge.attr('src', clan.badgeUrls.medium);
        elements.myClan.name.text(clan.name);
        elements.myClan.tag.text(clan.tag);
    }

    function displayWar(type, warData) {
        if (warData.state === 'notInWar') {
            elements.warType.text('Not In War');
        } else {
            elements.warType.text(type === 'cwl' ? 'Clan War League' : 'Regular War');
        }
        elements.warType.attr("data-war-type", type);

        elements.oponentClan.name.text(warData.opponent.name || 'Unknown');
        elements.oponentClan.tag.text(warData.opponent.tag);
        elements.oponentClan.badge.attr('src', warData.opponent.badgeUrls.medium);

        elements.centerInfo.removeClass('hidden')
        elements.oponentClanInfo.removeClass('hidden')
        elements.warTypeContainer.removeClass('hidden')

        const ourDestruction = (warData.clan.destructionPercentage || 0).toFixed(2);
        elements.myClan.totalAtkCountDetails.html(`<span class="flex flex-wrap gap-x-1"><span class="text-md text-white/50">${ourDestruction}%</span> ${warData.clan.attacks || 0} / ${warData.teamSize}</span>`);
        elements.myClan.totalStar.text(`${warData.clan.stars} / ${warData.teamSize * 3}`);
        elements.myClan.totalStarPercentage.css("width", `${ourDestruction}%`);

        const opponentDestruction = (warData.opponent.destructionPercentage || 0).toFixed(2);
        elements.oponentClan.totalAtkCountDetails.html(`<span class="flex flex-wrap justify-end gap-x-1"><span class="text-md text-white/50">${opponentDestruction}%</span>${warData.opponent.attacks || 0} / ${warData.teamSize}</span>`);
        elements.oponentClan.totalStar.text(`${warData.opponent.stars} / ${warData.teamSize * 3}`);
        elements.oponentClan.totalStarPercentage.css("width", `${opponentDestruction}%`);

        if (warData.state === 'notInWar') { return; }

        let countdown = getWarCountdown(warData.preparationStartTime, (type === 'cwl' ? warData.warStartTime : warData.startTime), warData.endTime);

        if (countdown) {
            elements.warTimerLabel.show();
            elements.warTimer.text(countdown.time);
            elements.warTimerLabel.text(countdown.label);
        } else {
            elements.warTimer.text("War Ended");
            elements.warTimerLabel.hide();
        }

        // Auto update every 60s
        setInterval(() => {
            countdown = getWarCountdown(warData.preparationStartTime, warData.warStartTime, warData.endTime);

            if (countdown) {
                elements.warTimerLabel.show();
                elements.warTimer.text(countdown.time);
                elements.warTimerLabel.text(countdown.label);
            } else {
                elements.warTimer.text("War Ended");
                elements.warTimerLabel.hide();
            }
        }, 60000);
    }

    function attachTrophiesToMyClan(myClan, clanRes) {
        const trophyMap = {};

        clanRes.members.items.forEach(member => {
            trophyMap[member.tag] = member.trophies || 0;
        });

        myClan.members.forEach(member => {
            member.trophies = trophyMap[member.tag] || 0;
        });

        return myClan;
    }

    function fixClashTimeFormat(str) {
        return str.replace(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
            "$1-$2-$3T$4:$5:$6"
        );
    }

    function getWarCountdown(preparationStart, warStart, warEnd) {
        // Step 1: Fix the time format
        const prepTime = Date.parse(fixClashTimeFormat(preparationStart));
        const warTime = Date.parse(fixClashTimeFormat(warStart));
        const endTime = Date.parse(fixClashTimeFormat(warEnd));

        const nowUTC = Date.now(); // current UTC time in ms

        let remaining;
        let label;

        if (nowUTC < warTime) {
            remaining = warTime - nowUTC;
            label = "Preparation Day";
        } else if (nowUTC >= warTime && nowUTC < endTime) {
            remaining = endTime - nowUTC;
            label = "Battle Day";
        } else {
            return null; // War Ended
        }

        const totalMinutes = Math.floor(remaining / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return {
            time: `${hours}h ${minutes}m`,
            label
        };
    }

    function normalizeBaseOrder(members) {
        return members
            .filter(m => typeof m.mapPosition === 'number')
            .sort((a, b) => a.mapPosition - b.mapPosition) // sort by actual base number
            .map((m, i) => {
                return { ...m, normalizedPosition: i + 1 }; // assign 1-based serial
            });
    }

    function buildPlannerTable(members, enemyClan, warData) {
        elements.warBaseMyClanMembersContainer.empty();

        members.forEach((member, key) => {
            // const existingPlan = plan.find(p => p.tag === member.tag) || {};

            // 🏆 Town hall image
            const townHallImage = townHalls(member.townhallLevel ?? 1, (member.bestOpponentAttack?.stars > 1 ? true : false));
            const townHallHtml = `<img src="${townHallImage}" alt="Townhall" class="h-12 xl:h-28 cursor-pointer" draggable="false">`;
            // 🏆 Town hall image

            // best oponent attack
            let bestOponentAttack = '';
            if (member.bestOpponentAttack) {
                const atckerData = enemyClan.find(p => p.tag === member?.bestOpponentAttack?.attackerTag) || {};
                const percent = member?.bestOpponentAttack?.destructionPercentage.toFixed(2);

                let starsHtml = '';
                for (let s = 1; s <= 3; s++) {
                    const opacity = s <= member.bestOpponentAttack.stars ? '' : 'grayscale';
                    starsHtml += `<span class="${opacity}">⭐</span>`;
                }

                bestOponentAttack += `<span class="block text-xs border-2 border-slate-200/40 rounded-lg py-1 px-2"><span class="font-bold block w-full truncate text-[14px] mb-[2px]">#${atckerData.normalizedPosition} ${atckerData.name}</span>${starsHtml} ${percent}%</span>`;
            }
            // best oponent attack

            // 🏆 Trophy column with image
            const trophyImage = trophyBadge(member.trophies ?? 0);
            const trophyHtml = `<span class="inline items-center gap-1">
                <img src="${trophyImage}" alt="trophy" class="w-8 inline" />
                <span class="bg-neutral-700/60 text-white text-[12px] px-[3px] py-[1px] rounded-full">${member.trophies || '-'}</span>
            </span>`;

            let attackInfo = '—';
            if (member.attacks?.length > 0) {
                attackInfo = '';

                member.attacks.forEach((a, i) => {
                    const defenderData = enemyClan.find(p => p.tag === a.defenderTag) || {};
                    const percent = a.destructionPercentage.toFixed(2);

                    let starsHtml = '';
                    for (let s = 1; s <= 3; s++) {
                        const opacity = s <= a.stars ? '' : 'grayscale';
                        starsHtml += `<span class="${opacity}">⭐</span>`;
                    }

                    attackInfo += `<span class="block text-xs border rounded-lg py-1"><span class="text-slate-400">#${defenderData.normalizedPosition}</span> ${defenderData.name} <br> ${starsHtml} ${percent}%</span>`;
                });
            }

            let defenceInfo = '—';
            if (member.opponentAttacks > 0) {
                defenceInfo = '';

                let opponentAttacks = enemyClan.flatMap(enemy =>
                    (enemy.attacks || []).filter(atk => atk.defenderTag === member.tag)
                );

                if (opponentAttacks) {
                    opponentAttacks.forEach((a, i) => {
                        const atckerData = enemyClan.find(p => p.tag === a.attackerTag) || {};
                        const percent = member?.bestOpponentAttack?.destructionPercentage.toFixed(2);

                        let starsHtml = '';
                        for (let s = 1; s <= 3; s++) {
                            const opacity = s <= member.bestOpponentAttack.stars ? '' : 'grayscale';
                            starsHtml += `<span class="${opacity}">⭐</span>`;
                        }

                        defenceInfo += `<span class="block text-xs border rounded-lg py-1"><span class="text-slate-400">#${atckerData.normalizedPosition}</span> ${atckerData.name} <br> ${starsHtml} ${percent}%</span>`;
                    });
                }
            }

            const playerDataEl = `
                <li class="flex ${isOdd(key) ? 'items-start' : 'items-end'} mt-[5px] sm:mt-0 xl:!-mt-[10px] flex-col justify-end space-x-3 war-participator-item">
                    <div class="item flex flex-col justify-center items-center relative" data-attacker-position="${member.normalizedPosition}" data-attacker-tag="${member.tag}" data-attacker-name="${member.name}">
                        <p class="font-semibold m-0 p-0 text-xs xl:text-lg cursor-pointer absolute -top-7 w-[135px] h-[30px] truncate" title="${member.name}">
                            ${member.normalizedPosition ?? '-'}. ${member.name}
                        </p>
                        ${townHallHtml}

                        <div class="best-defence h-[44px] w-[120px] md:w-[155px] text-center">${bestOponentAttack}</div>

                        <!-- Tooltip -->
                        <div class="absolute tooltip-container -top-[15px] xl:!top-[0px] mt-3 left-1/2 -translate-x-1/2 w-[155px] hidden group-hover:block
                        px-4 pb-4 py-2 bg-gray-800/90 text-white text-sm rounded-lg max-w-xs shadow-lg z-[9]
                        before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2
                        before:border-8 before:border-transparent before:border-b-gray-800/80">
                        <span class="text-center block text-lg">⚔️</span>
                        <div class="atk-history">
                            ${attackInfo}
                        </div>

                        <span class="text-center block text-lg mt-2">🛡️</span>
                        <div class="defence-history">
                            ${defenceInfo}
                        </div>
                        </div>
                    </div>
                </li>
            `;

            elements.warBaseMyClanMembersContainer.append(playerDataEl);

            prepareItemDragGhost(member.tag, member.name);
        });

        enemyClan.forEach((member, key) => {
            // 🏆 Town hall image
            const townHallImage = townHalls(member.townhallLevel ?? 1, (member.bestOpponentAttack?.stars > 1 ? true : false));
            const townHallHtml = `<img src="${townHallImage}" alt="Townhall" class="h-12 xl:h-28 cursor-pointer" draggable="false">`;
            // 🏆 Town hall image

            // best oponent attack
            let bestOponentAttack = '';
            if (member.bestOpponentAttack) {
                const atckerData = members.find(p => p.tag === member?.bestOpponentAttack?.attackerTag) || {};
                const percent = member?.bestOpponentAttack?.destructionPercentage.toFixed(2);

                let starsHtml = '';
                for (let s = 1; s <= 3; s++) {
                    const opacity = s <= member.bestOpponentAttack.stars ? '' : 'grayscale';
                    starsHtml += `<span class="${opacity}">⭐</span>`;
                }

                bestOponentAttack += `<span class="block text-xs border-2 border-slate-200/40 rounded-lg py-1 px-2"><span class="font-bold block w-full truncate text-[14px] mb-[2px]">#${atckerData.normalizedPosition} ${atckerData.name}</span>${starsHtml} ${percent}%</span>`;
            }
            // best oponent attack

            let attackInfo = '—';
            if (member.attacks?.length > 0) {
                attackInfo = '';

                member.attacks.forEach((a, i) => {
                    const defenderData = members.find(p => p.tag === a.defenderTag) || {};
                    const percent = a.destructionPercentage.toFixed(2);

                    let starsHtml = '';
                    for (let s = 1; s <= 3; s++) {
                        const opacity = s <= a.stars ? '' : 'grayscale';
                        starsHtml += `<span class="${opacity}">⭐</span>`;
                    }

                    attackInfo += `<span class="block text-xs border rounded-lg py-1"><span class="text-slate-400">#${defenderData.normalizedPosition}</span> ${defenderData.name} <br> ${starsHtml} ${percent}%</span>`;
                });
            }

            let defenceInfo = '—';
            if (member.opponentAttacks > 0) {
                defenceInfo = '';

                let opponentAttacks = members.flatMap(enemy =>
                    (enemy.attacks || []).filter(atk => atk.defenderTag === member.tag)
                );

                if (opponentAttacks) {
                    opponentAttacks.forEach((a, i) => {
                        const atckerData = members.find(p => p.tag === a.attackerTag) || {};
                        const percent = member?.bestOpponentAttack?.destructionPercentage.toFixed(2);

                        let starsHtml = '';
                        for (let s = 1; s <= 3; s++) {
                            const opacity = s <= member.bestOpponentAttack.stars ? '' : 'grayscale';
                            starsHtml += `<span class="${opacity}">⭐</span>`;
                        }

                        defenceInfo += `<span class="block text-xs border rounded-lg py-1"><span class="text-slate-400">#${atckerData.normalizedPosition}</span> ${atckerData.name} <br> ${starsHtml} ${percent}%</span>`;
                    });
                }
            }

            const enemyPlayerDataEl = `
                <li class="flex ${!isOdd(key) ? 'items-start' : 'items-end'} mt-[5px] sm:mt-0 xl:!-mt-[10px] flex-col justify-end space-x-3 war-participator-item">
                    <div class="item flex flex-col justify-center items-center relative" data-defender-tag="${member.tag}" data-defender-name="${member.name}">
                        <p class="font-semibold m-0 p-0 text-xs xl:text-lg cursor-pointer absolute -top-7 w-[135px] h-[30px] truncate" title="${member.name}">
                            ${member.normalizedPosition ?? '-'}. ${member.name}
                        </p>
                        ${townHallHtml}

                        <div class="best-defence h-[44px] w-[120px] md:w-[155px] text-center">${bestOponentAttack}</div>

                        <!-- Tooltip -->
                        <div class="absolute z-[9] tooltip-container -top-[15px] xl:!top-[0px] mt-3 left-1/2 -translate-x-1/2 w-[155px] hidden group-hover:block
                        px-4 pb-4 py-2 bg-gray-800/90 text-white text-sm rounded-lg max-w-xs shadow-lg
                        before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2
                        before:border-8 before:border-transparent before:border-b-gray-800/80">
                        <span class="text-center block text-lg">⚔️</span>
                            <div class="atk-history">
                                ${attackInfo}
                            </div>

                            <span class="text-center block text-lg mt-2">🛡️</span>
                            <div class="defence-history">
                                ${defenceInfo}
                            </div>
                        </div>

                        <div class="assigned-attacker group m-0 p-0 -top-1 xl:top-2 w-[125px] h-[55px] absolute flex flex-col gap-1 flex-wrap"></div>
                    </div>
                </li>
            `;

            elements.warBaseOponentClanMembersContainer.append(enemyPlayerDataEl);
        });

        elements.warBaseContainer.removeClass('hidden');
    }

    // 🔁 Auto-load everything on page ready
    loadEverything();
});

$(document).ready(function () {
    // item এ ক্লিক করলে tooltip toggle হবে
    $("#war-bases-container").on("click", ".war-participator-item .item", function (e) {
        e.stopPropagation(); // বাইরে propagate বন্ধ

        let $tooltip = $(this).find(".tooltip-container");

        // অন্য tooltip গুলো বন্ধ করো
        $(".war-participator-item .item .tooltip-container").not($tooltip).addClass("hidden");

        // এই tooltip টা toggle করো
        $tooltip.toggleClass("hidden");
    });

    // tooltip এর ভিতরে ক্লিক করলে কিছু হবে না
    $(".war-participator-item .item .tooltip-container, .attacker-flag").on("click", function (e) {
        e.stopPropagation();
    });

    $(".war-participator-item .item").on("click", '.attacker-flag', function (e) {
        e.stopPropagation();
    });

    // বাইরে ক্লিক করলে সব tooltip বন্ধ
    $(document).on("click", function () {
        $(".war-participator-item .item .tooltip-container").addClass("hidden");
    });
});