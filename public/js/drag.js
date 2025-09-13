async function loadDragEverything(members, enemyClan, warData, strategy) {
    // ===== States =====
    let isDragging = false;        // desktop native DnD
    let isTouchDragging = false;   // mobile/pen fallback DnD

    // ===== Auto-scroll (desktop + mobile) =====
    const SCROLL_EL = window;      // চাইলে স্ক্রলেবল container দিন (e.g., document.querySelector('#war-scroll'))
    const EDGE_PX = 80;          // টপ/বটম থেকে কতটা কাছে এলে স্ক্রল হবে
    const MIN_SPEED = 6;           // প্রতি ফ্রেম px
    const MAX_SPEED = 28;

    let autoScrollRaf = null;
    let lastClientY = 0;

    function scrollByDy(dy) {
        if (!dy) return;
        if (SCROLL_EL === window) window.scrollBy(0, dy);
        else SCROLL_EL.scrollTop += dy;
    }

    function autoScrollLoop() {
        if (!isDragging && !isTouchDragging) return;

        const viewportH =
            (SCROLL_EL === window)
                ? (window.innerHeight || document.documentElement.clientHeight)
                : SCROLL_EL.clientHeight;

        let dy = 0;
        if (lastClientY < EDGE_PX) {
            const k = (EDGE_PX - lastClientY) / EDGE_PX;         // 0..1
            dy = - (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * k);
        } else if (viewportH - lastClientY < EDGE_PX) {
            const k = (EDGE_PX - (viewportH - lastClientY)) / EDGE_PX;
            dy = (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * k);
        }

        if (dy) scrollByDy(dy);
        autoScrollRaf = requestAnimationFrame(autoScrollLoop);
    }

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollRaf = requestAnimationFrame(autoScrollLoop);
    }

    function stopAutoScroll() {
        if (autoScrollRaf) cancelAnimationFrame(autoScrollRaf);
        autoScrollRaf = null;
    }
    // ===== Auto-scroll (desktop + mobile) =====

    // ===== Config =====
    const MAX_PER_ATTACKER = elements.warType.data('war-type') === 'cwl' ? 1 : 2;
    const MAX_PER_DEFENDER = elements.warType.data('war-type') === 'cwl' ? 1 : 2;
    const REMOVE_THRESHOLD = (isTouchLike() ? 40 : 60);  // swipe/drag-left ≥ threshold => remove
    const ASSIGNED_EVENT = "war:assigned";
    const MODIFY_EVENT = "war:assign-modify";
    // ===== Config =====

    const $myItems = $("#my-clan-member-list-container .war-participator-item .item");
    const $oppItems = $("#oponent-clan-member-list-container .war-participator-item .item");

    // existing attack plan
    generateSavedStrategyDom();
    async function generateSavedStrategyDom() {
        if (Object.keys(strategy).length) {
            Object.entries(strategy).forEach(([defenderTag, attackerTags]) => {
                const defenderItemElement = elements.warBaseOponentClanMembersContainer
                    .find('.war-participator-item .item[data-defender-tag="' + defenderTag + '"]');

                if (defenderItemElement) {
                    attackerTags.forEach(attackerTag => {
                        const attackerData = members.find(p => p.tag === attackerTag) || {};
                        if (attackerData) {
                            defenderItemElement.find(".assigned-attacker .war-flag").remove();
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

    function getGlobalAssignments(tag) {
        return $(`.assigned-attacker .attacker-flag`).filter((_, el) =>
            $(el).data('attackerTag') == tag
        );
    }

    // 2) নামভিত্তিক ghost Image ক্যাশ
    const ghostCache = new Map();
    function getOrCreateFlagImage(name, opts = {}) {
        const key = name + "::" + JSON.stringify(opts);
        if (ghostCache.has(key)) return ghostCache.get(key);

        const img = new Image();
        img.decoding = "sync";
        img.src = makeFlagSVGDataURL(name, opts);
        ghostCache.set(key, img);
        return img;
    }

    const fontsReady = document.fonts ? document.fonts.ready.catch(() => { }) : Promise.resolve();

    // draggable enable
    $myItems.attr("draggable", true);

    // ===== Desktop native DnD =====
    $myItems.on("dragstart", function (e) {
        isDragging = true;
        startAutoScroll();

        const dt = e.originalEvent.dataTransfer;
        dt.effectAllowed = "move";

        const attackerPosition = $(this).data("attacker-position") || 0;
        const attackerName = $(this).data("attacker-name") || $.trim($(this).find("p").text());

        $(this).addClass("dragging");

        const nameImg = getOrCreateFlagImage(attackerName, {});

        dt.setData("text/plain", JSON.stringify({
            attackerTag: $(this).data("attacker-tag") || null,
            attackerName,
            attackerPosition
        }));

        if (nameImg.complete) {
            try { dt.setDragImage(nameImg, 24, 28); } catch (_) { }
        } else {
            const updateGhost = () => {
                if (!isDragging) return;
                try { dt.setDragImage(nameImg, 24, 28); } catch (_) { }
            };
            const onLoad = () => {
                nameImg.removeEventListener("load", onLoad);
                Promise.resolve(fontsReady).then(updateGhost);
            };
            nameImg.addEventListener("load", onLoad, { once: true });
        }
    });

    $myItems.on("dragend", function () {
        isDragging = false;
        stopAutoScroll();
        $(this).removeClass("dragging");
    });

    // গ্লোবাল dragover → cursor + auto-scroll Y feed
    $(document).on("dragover", function (e) {
        if (!isDragging) return;
        e.preventDefault();
        const oe = e.originalEvent || e;
        lastClientY = oe.clientY || 0; // auto-scroll engine feed
        try { oe.dataTransfer.dropEffect = "move"; } catch (_) { }
    });

    // droppable prepare (opponent items)
    $oppItems.each(function () {
        if ($(this).css("position") === "static") $(this).css("position", "relative");
    });

    $oppItems.on("dragover", function (e) {
        e.preventDefault();
        try { e.originalEvent.dataTransfer.dropEffect = "move"; } catch (_) { }
        $(this).addClass("droppable-hover");
    });

    $oppItems.on("dragleave", function () {
        $(this).removeClass("droppable-hover");
    });

    $oppItems.on("drop", function (e) {
        e.preventDefault();
        isDragging = false;
        stopAutoScroll();

        const $target = $(this).removeClass("droppable-hover");

        let payload = {};
        try { payload = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain") || "{}"); } catch (_) { }

        $target.find(".war-flag").remove();

        appendAttacker($target, {
            attackerTag: payload.attackerTag,
            attackerPosition: payload.attackerPosition,
            attackerName: payload.attackerName
        });
    });
    // ===== Desktop native DnD =====

    // ===== Helper: attacker যোগ করা (ডুপ্লিকেট-প্রুফ) =====
    function appendAttacker($target, payload) {
        const $box = $target.find('.assigned-attacker');

        // Global cap per attacker
        const $global = getGlobalAssignments(payload.attackerTag);
        if ($global.length >= MAX_PER_ATTACKER) return;

        // Already exists on this defender? -> update + move to end
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

        // Defender box limit (FIFO)
        if ($box.children().length >= MAX_PER_DEFENDER) {
            const $old = $box.children().first();
            const before = $box.children('.attacker-flag')
                .map(function () { return $(this).data('attackerTag') || null; }).get();

            $old.remove();
            $(document).trigger(MODIFY_EVENT, {
                action: 'auto-remove-old',
                attackerTags: before.filter(t => t !== $old.data('attackerTag')),
                defenderTag: $target.data('defender-tag') || null
            });
        }

        // New flag
        const $flag = $(`<p class="attacker-flag animate-bounce group-hover:animate-none text-[10px] leading-[18px] xl:leading-[22px] xl:text-[14px] border border-white/30 transition bg-red-500/50 rounded-lg w-full h-[20px] xl:h-[25px] select-none px-2 overflow-hidden whitespace-nowrap text-ellipsis" title="${payload.attackerName}" data-attacker-tag="${payload.attackerTag}" data-defender-tag="${$target.data("defender-tag") || null}">#${payload.attackerPosition} ${payload.attackerName}</p>`);

        $flag.data({
            attackerTag: payload.attackerTag,
            attackerName: payload.attackerName,
            attackerPosition: payload.attackerPosition,
            defenderTag: $target.data("defender-tag") || null
        });

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
                const $container = $el.closest('.assigned-attacker');
                const $siblings = $container.find('.attacker-flag').not($el);
                const $defenderTag = $el.closest('.war-participator-item').find('.item').data("defender-tag") || null;

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

        if (!Array.isArray(attackerTags)) attackerTags = [attackerTags];

        const nextList = [];
        const seen = new Set();
        for (const t of attackerTags) {
            const v = (t ?? "").toString().trim();
            if (!v || seen.has(v)) continue;
            seen.add(v);
            nextList.push(v);
        }

        try {
            let existingData = {};
            try {
                const res = await fetch('/api/attack-strategy');
                if (res.ok) existingData = await res.json();
            } catch (_) { }

            if (nextList.length === 0) {
                existingData[defenderTag] = [];
            } else {
                existingData[defenderTag] = nextList;
            }

            await $.ajax({
                url: '/api/attack-strategy',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(existingData),
            });
        } catch (err) {
            console.error('Failed to save strategy', err);
        }
    }

    $(document).on(ASSIGNED_EVENT, function (_e, data) { saveStrategy(data); });
    $(document).on(MODIFY_EVENT, function (_e, data) { saveStrategy(data); });

    // ===== Feature detect: মোবাইলে নেটিভ DnD এড়াই =====
    function isTouchLike() {
        const nav = window.navigator || {};
        return ('maxTouchPoints' in nav ? nav.maxTouchPoints > 0 : 'ontouchstart' in window);
    }

    // Opponent টার্গেট খোঁজার ইউটিল (drop hit-test)
    function getDropTargetAt(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        return $(el).closest('#oponent-clan-member-list-container .war-participator-item .item')[0] || null;
    }

    // ফলোয়ার ঘোস্ট তৈরি (মোবাইল fallback)
    function makeFollower(labelText) {
        const el = document.createElement('div');
        el.className = 'drag-follower';
        el.style.position = 'fixed';
        el.style.left = '0';
        el.style.top = '0';
        el.style.pointerEvents = 'none';
        el.style.zIndex = '9999';
        el.style.padding = '4px 8px';
        el.style.borderRadius = '8px';
        el.style.fontSize = '12px';
        el.style.background = 'rgba(0,0,0,0.7)';
        el.style.color = '#fff';
        el.style.whiteSpace = 'nowrap';
        el.textContent = labelText || '';
        document.body.appendChild(el);
        return el;
    }

    // ===== Mobile touch fallback DnD =====
    function enableMobileTouchDrag($items) {
        let dragging = false, follower = null, payload = null;

        $items.each(function () {
            const node = this;

            node.addEventListener('pointerdown', (e) => {
                // কেবল touch/pen এর জন্য
                if (e.pointerType === 'mouse') return;

                dragging = true;
                isTouchDragging = true;
                startAutoScroll();
                lastClientY = e.clientY; // auto-scroll engine feed

                const $it = $(node);
                const attackerPosition = $it.data('attacker-position') || 0;
                const attackerName =
                    $it.data('attacker-name') || $.trim($it.find('p').text());

                payload = {
                    attackerTag: $it.data('attacker-tag') || null,
                    attackerName,
                    attackerPosition
                };

                follower = makeFollower(`#${attackerPosition} ${attackerName}`);
                node.setPointerCapture && node.setPointerCapture(e.pointerId);
            }, { passive: true });

            node.addEventListener('pointermove', (e) => {
                if (!dragging || e.pointerType === 'mouse') return;
                lastClientY = e.clientY; // auto-scroll engine feed
                if (follower) {
                    follower.style.transform = `translate(${e.clientX + 8}px, ${e.clientY + 8}px)`;
                }
            }, { passive: true });

            const endDrag = (e) => {
                if (!dragging || e.pointerType === 'mouse') return;
                dragging = false;

                const dropNode = getDropTargetAt(e.clientX, e.clientY);
                if (dropNode && payload) {
                    const $target = $(dropNode);
                    $target.find(".war-flag").remove();
                    appendAttacker($target, {
                        attackerTag: payload.attackerTag,
                        attackerPosition: payload.attackerPosition,
                        attackerName: payload.attackerName
                    });
                }

                if (follower) { follower.remove(); follower = null; }
                payload = null;

                isTouchDragging = false;
                stopAutoScroll();

                node.releasePointerCapture && node.releasePointerCapture(e.pointerId);
            };

            node.addEventListener('pointerup', endDrag);
            node.addEventListener('pointercancel', endDrag);
        });
    }

    if (isTouchLike()) {
        enableMobileTouchDrag($myItems);
    }
}
