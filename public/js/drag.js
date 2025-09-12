async function loadDragEverything(members, enemyClan, warData, strategy) {
    // ===== Config =====
    const MAX_PER_ATTACKER = elements.warType.data('war-type') === 'cwl' ? 2 : 2;
    const MAX_PER_DEFENDER = elements.warType.data('war-type') === 'cwl' ? 2 : 2;
    const REMOVE_THRESHOLD = 60;           // swipe/drag-left ≥ 60px => remove
    const ASSIGNED_EVENT = "war:assigned";
    const MODIFY_EVENT = "war:assign-modify";
    // ===== Config =====

    let isDragging = false;

    const $myItems = $("#my-clan-member-list-container .war-participator-item .item");
    const $oppItems = $("#oponent-clan-member-list-container .war-participator-item .item");

    // 1) ফfallback ghost প্রিলোড (প্রথম ড্র্যাগেও visible)
    // const fallbackImg = new Image();
    // fallbackImg.src = "images/flag.svg"; // আপনার fallback আইকন (ছোট/হালকা রাখুন)
    // fallbackImg.draggable = false;
    // fallbackImg.style.position = "absolute";
    // fallbackImg.style.left = "-9999px";
    // fallbackImg.style.width = "48px";
    // fallbackImg.style.height = "58px";
    // fallbackImg.style.top = "-9999px";
    // document.body.appendChild(fallbackImg);

    // existing attack plan
    generateSavedStrategyDom();
    async function generateSavedStrategyDom() {
        if (Object.keys(strategy).length) {
            Object.entries(strategy).forEach(([defenderTag, attackerTags]) => {
                const defenderItemElement = elements.warBaseOponentClanMembersContainer.find('.war-participator-item .item[data-defender-tag="' + defenderTag + '"]');

                if (defenderItemElement) {
                    attackerTags.forEach(attackerTag => {
                        const attackerData = members.find(p => p.tag === attackerTag) || {};

                        if (attackerData) {
                            defenderItemElement.find(".assigned-attacker .war-flag").remove();
                            // নতুন flag বসান
                            appendAttacker(defenderItemElement, {
                                attackerTag: attackerTag,
                                attackerPosition: attackerData.normalizedPosition,
                                attackerName: attackerData.name
                            });
                        }
                    });
                }
            });
        }
    }
    // existing attack plan

    function getGlobalAssignments(tag) {
        return $(`.assigned-attacker .attacker-flag`).filter((_, el) =>
            $(el).data('attackerTag') == tag
        );
    }

    // 2) নামভিত্তিক ghost Image ক্যাশ
    const ghostCache = new Map();
    /**
     * @returns {HTMLImageElement} cached or newly created Image
     */
    function getOrCreateFlagImage(name, opts = {}) {
        const key = name + "::" + JSON.stringify(opts);
        if (ghostCache.has(key)) return ghostCache.get(key);

        const img = new Image();
        // ব্রাউজারকে hint: দ্রুত ডিকোড করো (সবখানে কাজ নাও করতে পারে, ক্ষতি নেই)
        img.decoding = "sync";
        img.src = makeFlagSVGDataURL(name, opts);
        ghostCache.set(key, img);
        return img;
    }

    // (ঐচ্ছিক) ওয়েবফন্ট থাকলে টেক্সট শেপ reliable করতে
    const fontsReady = document.fonts ? document.fonts.ready.catch(() => { }) : Promise.resolve();


    // draggable enable
    $myItems.attr("draggable", true);

    // dragstart
    $myItems.on("dragstart", function (e) {
        isDragging = true;

        const dt = e.originalEvent.dataTransfer;
        dt.effectAllowed = "move";

        const attackerPosition =
            $(this).data("attacker-position") || 0;

        const attackerName =
            $(this).data("attacker-name") ||
            $.trim($(this).find("p").text());

        $(this).addClass("dragging");

        const nameImg = getOrCreateFlagImage(attackerName, {
            // width: 140, height: 56, maxChars: 16, ইত্যাদি
        });

        // 1) data payload আগে
        dt.setData("text/plain", JSON.stringify({
            attackerTag: $(this).data("attacker-tag") || null,
            attackerName: attackerName,
            attackerPosition: attackerPosition,
            // nameImgSrc: nameImg.src || 'images/flag.svg'
        }));

        // 3) ইমিডিয়েট ট্রাই: যদি আগেই লোডেড থাকে
        if (nameImg.complete) {
            try { dt.setDragImage(nameImg, 24, 28); } catch (_) { }
        } else {
            // নাহলে fallback দেখাই
            // try { dt.setDragImage(fallbackImg, 20, 45); } catch (_) { }

            // দ্রুত লোড হলে ড্র্যাগ চলাকালীনই ghost আপডেট
            const updateGhost = () => {
                if (!isDragging) return;
                try { dt.setDragImage(nameImg, 24, 28); } catch (_) { }
            };

            // ইমেজ ও (ঐচ্ছিক) ফন্ট রেডি হলে আপডেট
            const onLoad = () => {
                nameImg.removeEventListener("load", onLoad);
                // fontsReady থাকলে অল্প বিলম্বে আরও শার্প টেক্সট
                Promise.resolve(fontsReady).then(updateGhost);
            };

            nameImg.addEventListener("load", onLoad, { once: true });
        }
    });

    $myItems.on("dragend", function () {
        isDragging = false;
        $(this).removeClass("dragging");
    });

    // 🔑 গ্লোবাল dragover → cursor fix (সব জায়গায় move)
    $(document).on("dragover", function (e) {
        if (!isDragging) return;
        e.preventDefault();
        try { e.originalEvent.dataTransfer.dropEffect = "move"; } catch (_) { }
    });

    // droppable prepare (opponent items)
    $oppItems.each(function () {
        if ($(this).css("position") === "static") $(this).css("position", "relative");
    });

    // droppable dragover
    $oppItems.on("dragover", function (e) {
        e.preventDefault();
        try { e.originalEvent.dataTransfer.dropEffect = "move"; } catch (_) { }
        $(this).addClass("droppable-hover");
    });

    // droppable dragleave
    $oppItems.on("dragleave", function () {
        $(this).removeClass("droppable-hover");
    });

    // drop
    $oppItems.on("drop", function (e) {
        e.preventDefault();
        isDragging = false;

        const $target = $(this).removeClass("droppable-hover");

        let payload = {};
        try { payload = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain") || "{}"); } catch (_) { }

        // পুরনো flag সরান (একটাই রাখতে চাইলে)
        $target.find(".war-flag").remove();

        // নতুন flag বসান
        appendAttacker($target, {
            attackerTag: payload.attackerTag,
            attackerPosition: payload.attackerPosition,
            attackerName: payload.attackerName
        });
    });

    // ===== Helper: attacker যোগ করা (ডুপ্লিকেট-প্রুফ) =====
    function appendAttacker($target, payload) {
        const $box = $target.find('.assigned-attacker');

        // 0) গ্লোবাল cap: এই attackerTag আগেই কয়বার আছে?
        const $global = getGlobalAssignments(payload.attackerTag);
        if ($global.length >= MAX_PER_ATTACKER) {
            // লিমিট হিট
            // $(document).trigger(MODIFY_EVENT, {
            //     action: 'assign-blocked-by-global-cap',
            //     attackerTag: payload.attackerTag,
            //     attackerName: payload.attackerName,
            //     currentCount: $global.length,  // = MAX_PER_ATTACKER
            //     defenderTag: $target.data('defender-tag') || null
            // });
            return;
        }

        // 0) আগেই যদি এই tag-এর আইটেম থাকে → ডুপ্লিকেট ব্লক/আপডেট
        const $dup = $box.children('.attacker-flag').filter((_, el) =>
            $(el).data('attackerTag') == payload.attackerTag
        );

        if ($dup.length) {
            $dup
                .attr('title', payload.attackerName)
                .text(`#${payload.attackerPosition} ${payload.attackerName}`)
                .appendTo($box);

            const $flagsNow = $box.children('.attacker-flag');
            $(document).trigger(MODIFY_EVENT, {
                action: 'update-existing',
                attackerTags: $flagsNow.map(function () { return $(this).data('attackerTag') || null; }).get(),
                defenderTag: $target.data('defender-tag') || null
            });
            return;
        }

        // 2) defender বক্স লিমিট মানা (FIFO)
        if ($box.children().length >= MAX_PER_DEFENDER) {
            const $old = $box.children().first();
            const before = $box.children('.attacker-flag')
                .map(function () { return $(this).data('attackerTag') || null; }).get();

            $old.remove();
            $(document).trigger(MODIFY_EVENT, {
                action: 'auto-remove-old',
                attackerTags: before.filter(t => t !== $old.data('attackerTag')), // remove হওয়া বাদে লিস্ট
                defenderTag: $target.data('defender-tag') || null
            });
        }

        // 2) নতুন flag তৈরি
        const $flag = $(`<p class="attacker-flag animate-bounce group-hover:animate-none text-[10px] leading-[18px] xl:leading-[22px] xl:text-[14px] border border-white/30 transition bg-red-500/50 rounded-lg w-full h-[20px] xl:h-[25px] select-none px-2 overflow-hidden whitespace-nowrap text-ellipsis" title="${payload.attackerName}" data-attacker-tag="${payload.attackerTag}" data-defender-tag="${$target.data("defender-tag") || null}">#${payload.attackerPosition} ${payload.attackerName}</p>`);

        // ডেটা স্টোর
        $flag.data({
            attackerTag: payload.attackerTag,
            attackerName: payload.attackerName,
            attackerPosition: payload.attackerPosition,
            defenderTag: $target.data("defender-tag") || null
        });

        // 3) অ্যাপেন্ড + swipe/drag-to-remove bind
        $box.append($flag);
        enableSwipeRemove($flag);

        const $flagsNow = $box.children('.attacker-flag');
        $(document).trigger(MODIFY_EVENT, {
            action: 'assigned',
            attackerTags: $flagsNow.map(function () { return $(this).data('attackerTag') || null; }).get(),
            defenderTag: $target.data('defender-tag') || null
        });
    }

    // ===== Pointer Events ভিত্তিক swipe/drag-left remove (touch + mouse দুটোই) =====
    function enableSwipeRemove($el) {
        let startX = 0, currX = 0, dragging = false, pid = null;

        const onDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            pid = e.pointerId;
            dragging = true;
            startX = e.clientX;
            currX = 0;
            $el.css({ transition: 'none', willChange: 'transform' });
            e.target.setPointerCapture && e.target.setPointerCapture(pid);
        };

        const onMove = (e) => {
            if (!dragging || e.pointerId !== pid) return;
            currX = e.clientX - startX;
            const x = Math.min(0, currX); // কেবল বামে মুভ দেখাই
            $el.css({ transform: `translateX(${x}px)` });
        };

        const onUpCancel = (e) => {
            if (!dragging || e.pointerId !== pid) return;
            e.target.releasePointerCapture && e.target.releasePointerCapture(pid);
            dragging = false;

            const shouldRemove = (currX <= -REMOVE_THRESHOLD);

            if (shouldRemove) {
                // remove করার আগে parent container খুঁজে বের করি
                const $container = $el.closest('.assigned-attacker');
                // বর্তমান element বাদ দিয়ে siblings count করি
                const $siblings = $container.find('.attacker-flag').not($el);
                const $defenderTag = $el.closest('.war-participator-item').find('.item').data("defender-tag") || null;

                // এখন remove
                $el.remove();

                const info = {
                    action: 'removed',
                    attackerTags: $siblings.map(function () {
                        return $(this).data("attacker-tag") || null;
                    }).get(),
                    defenderTag: $defenderTag,
                };

                $(document).trigger(MODIFY_EVENT, info);
            } else {
                // snap back
                $el.css({ transition: 'transform 150ms ease', transform: 'translateX(0px)' });
            }
        };

        const node = $el[0];
        node.addEventListener('pointerdown', onDown, { passive: true });
        node.addEventListener('pointermove', onMove, { passive: true });
        node.addEventListener('pointerup', onUpCancel);
        node.addEventListener('pointercancel', onUpCancel);
    }

    async function saveStrategy(eventData) {
        if (!eventData?.defenderTag) return;

        const defenderTag = String(eventData.defenderTag).trim();
        let attackerTags = eventData.attackerTags;

        // normalize to array
        if (!Array.isArray(attackerTags)) attackerTags = [attackerTags];

        // clean + unique (keep input order)
        const nextList = [];
        const seen = new Set();
        for (const t of attackerTags) {
            const v = (t ?? "").toString().trim();
            if (!v || seen.has(v)) continue;
            seen.add(v);
            nextList.push(v);
        }

        try {
            // 1) load existing
            let existingData = {};
            try {
                const res = await fetch('/api/attack-strategy');
                if (res.ok) existingData = await res.json();
            } catch (_) { }

            // 2) REPLACE behavior
            if (nextList.length === 0) {
                // যদি ইনপুটে attacker না থাকে, চাইলে key ডিলিট করতে পারেন:
                // delete existingData[defenderTag];
                existingData[defenderTag] = []; // অথবা খালি অ্যারে রেখে দিন
            } else {
                existingData[defenderTag] = nextList;
            }

            // 3) save back
            await $.ajax({
                url: '/api/attack-strategy',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(existingData),
            });

            // console.log('Saved (replaced) strategy for', defenderTag, existingData[defenderTag]);
        } catch (err) {
            console.error('Failed to save strategy', err);
        }
    }

    // ===== কোথাও থেকে শোনা (উদাহরণ) =====
    $(document).on(ASSIGNED_EVENT, function (_e, data) {
        saveStrategy(data);
    });

    $(document).on(MODIFY_EVENT, function (_e, data) {
        saveStrategy(data);
    });
};