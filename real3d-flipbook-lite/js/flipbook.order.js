/*
 * Real3D Flipbook — order pad (bulk ordering).
 *
 * Platform-neutral panel: renders the pad, keeps the in-memory selection and
 * talks to a transport object supplied by the host page. It never touches a
 * cart or a product API itself and it does nothing unless a host constructs
 * it, so builds that ship without a host (WordPress, Wix, standalone) are
 * unaffected. Design: fable51-bulk-order-plan.md §4.
 *
 * Transport contract (all methods return promises unless noted):
 *   lookup(handle)            → { status: 'ok'|'unavailable'|'error', variants: [{ id, title, sku, available, price? }] }
 *   submit({ batchId, items }) → { state: 'confirmed'|'partial'|'failed'|'unknown', landed: { [variantId]: n }, message? }
 *   check(batchId)            → { state, landed }          (re-runs the host's cart read-back)
 *   release(batchId)          → void                       (host releases its submission lock; keeps the batch)
 *   viewCart()                → void                       (host navigates to the cart)
 */
(function () {
    if (typeof window === 'undefined') return;
    window.FLIPBOOK = window.FLIPBOOK || {};

    var DEFAULTS = {
        orderTitle: 'Order',
        orderPad: 'Order pad',
        onlySelected: 'Only selected',
        addToOrder: 'Add to order',
        addAllToCart: 'Add all to cart',
        viewCart: 'View cart',
        continueBrowsing: 'Continue browsing',
        startNewOrder: 'Start a new order',
        checkAgain: 'Check again',
        startOver: 'Start over — I have checked my cart',
        sku: 'SKU',
        quantity: 'Qty',
        orderCount: '{units} · {lines}',
        unitsOne: '{n} item',
        unitsOther: '{n} items',
        linesOne: '{n} variant',
        linesOther: '{n} variants',
        variantCount: '{n} variants',
        noVariants: 'No variants available',
        notAvailable: 'Not available in the online store',
        moreVariants: '+{n} more on the product page',
        loading: 'Loading…',
        loadError: 'Could not load this product. Try again.',
        adding: 'Adding to cart…',
        confirmed: 'Added to your cart.',
        partial: 'Some items were not added.',
        inCart: '{added} of {requested} in cart',
        failed: 'Could not add to cart.',
        unknown: 'Some items may have been added. Check your cart before trying again.',
        lateArrival: 'Anything that arrives late will still be in your cart.',
        reviewPrices: 'Review prices in your cart.',
        limitLines: 'Up to {n} products per order.',
        limitQuantity: 'Up to {n} per item.',
        invalidQuantity: 'Enter a whole number.',
        close: 'Close',
        empty: 'Nothing selected yet. Open a product and enter quantities.',
        selectedFilterEmpty: 'Nothing selected yet.'
    };

    function fmt(s, vars) {
        return String(s).replace(/\{(\w+)\}/g, function (m, k) {
            return vars && k in vars ? vars[k] : m;
        });
    }

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function handleFromUrl(href) {
        if (typeof href !== 'string') return '';
        var m = href.match(/\/products\/([a-z0-9][a-z0-9_.-]*)/i);
        return m ? m[1].toLowerCase() : '';
    }

    // Whole number typed into a quantity box. Blank means "not selected".
    function parseQuantity(raw) {
        var text = String(raw == null ? '' : raw).trim();
        if (text === '') return { ok: true, quantity: 0 };
        if (!/^[0-9]+$/.test(text)) return { ok: false, code: 'invalidQuantity' };
        var n = parseInt(text, 10);
        if (!Number.isSafeInteger(n)) return { ok: false, code: 'invalidQuantity' };
        return { ok: true, quantity: n };
    }

    function numericId(value) {
        return String(value == null ? '' : value).replace(/^gid:\/\/shopify\/ProductVariant\//, '');
    }

    // Host lookup results reduced to what the pad may show: numeric ids only,
    // and when the merchant restricted the product to some variants, only
    // those (compared numerically). An empty intersection is empty — never a
    // fallback to every variant.
    function filterVariants(list, allowedVariantIds) {
        var allowed = Array.isArray(allowedVariantIds) ? allowedVariantIds.map(numericId) : null;
        var out = [];
        (Array.isArray(list) ? list : []).forEach(function (v) {
            if (!v) return;
            var id = numericId(v.id);
            if (!/^\d+$/.test(id)) return;
            if (allowed && allowed.indexOf(id) === -1) return;
            out.push({ id: id, title: String(v.title || ''), sku: String(v.sku || ''), available: v.available !== false, price: v.price });
        });
        return out;
    }

    FLIPBOOK.OrderPanel = class {
        constructor(config, transport, strings) {
            this.config = config || {};
            this.transport = transport;
            this.maxLines = Number(this.config.maxLines) || 100;
            this.maxQuantity = Number(this.config.maxQuantity) || 999;
            this.products = Array.isArray(this.config.products) ? this.config.products : [];
            this.byHandle = new Map();
            this.products.forEach(function (p) { if (p && p.handle) this.byHandle.set(String(p.handle).toLowerCase(), p); }, this);
            this.strings = Object.assign({}, DEFAULTS);
            var s = strings || {};
            Object.keys(DEFAULTS).forEach(function (k) {
                if (typeof s[k] === 'string' && s[k]) this.strings[k] = s[k];
            }, this);

            this.selection = new Map();   // variantId → { quantity, handle, productTitle, variantTitle, sku, price }
            this.variants = new Map();    // handle → { status, variants }
            this.expanded = new Set();
            this.filterSelected = false;
            this.state = 'editing';
            this.result = null;           // last submit/check result
            this.batchId = null;
            this.unknownSince = 0;
            this.lastCheckAt = 0;
            this.lastCheckLanded = null;
            this.returnFocus = null;

            this.build();
        }

        // ---- DOM -------------------------------------------------------------

        build() {
            var st = this.strings;
            this.fab = el('button', 'r3d-order-fab');
            this.fab.type = 'button';
            this.fab.setAttribute('aria-haspopup', 'dialog');
            this.fabLabel = el('span', 'r3d-order-fab-label', st.orderTitle);
            this.fabCount = el('span', 'r3d-order-fab-count', '0');
            this.fab.appendChild(this.fabLabel);
            this.fab.appendChild(this.fabCount);
            // The floating count reopens the pad as the review: only selected rows.
            this.fab.addEventListener('click', () => { this.setFilter(this.totals().units > 0, true); this.open(this.fab); });
            document.body.appendChild(this.fab);

            this.root = document.createElement('dialog');
            this.root.className = 'r3d-order-panel';
            this.root.setAttribute('aria-label', st.orderTitle);
            this.root.addEventListener('close', () => {
                if (this.returnFocus && this.returnFocus.focus) { try { this.returnFocus.focus(); } catch (e) { /* gone */ } }
            });
            this.root.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });

            var head = el('div', 'r3d-order-head');
            this.title = el('h2', 'r3d-order-title', st.orderPad);
            var closeBtn = el('button', 'r3d-order-close');
            closeBtn.type = 'button';
            closeBtn.setAttribute('aria-label', st.close);
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => this.close());
            head.appendChild(this.title);
            head.appendChild(closeBtn);

            var controls = el('div', 'r3d-order-controls');
            this.filterBtn = el('button', 'r3d-order-filter');
            this.filterBtn.type = 'button';
            this.filterBtn.setAttribute('aria-pressed', 'false');
            this.filterBtn.textContent = st.onlySelected;
            this.filterBtn.addEventListener('click', () => this.setFilter(!this.filterSelected));
            controls.appendChild(this.filterBtn);
            this.countLine = el('div', 'r3d-order-count', '');
            controls.appendChild(this.countLine);

            this.status = el('div', 'r3d-order-status');
            this.status.setAttribute('role', 'status');
            this.status.setAttribute('aria-live', 'polite');

            this.list = el('div', 'r3d-order-list');

            var foot = el('div', 'r3d-order-foot');
            this.priceNote = el('div', 'r3d-order-pricenote', st.reviewPrices);
            this.actions = el('div', 'r3d-order-actions');
            foot.appendChild(this.priceNote);
            foot.appendChild(this.actions);

            this.root.appendChild(head);
            this.root.appendChild(controls);
            this.root.appendChild(this.status);
            this.root.appendChild(this.list);
            this.root.appendChild(foot);
            document.body.appendChild(this.root);

            this.renderList();
            this.renderFooter();
            this.renderCount();
        }

        open(trigger) {
            this.returnFocus = trigger || document.activeElement;
            if (!this.root.open) this.root.showModal();
            this.renderList();
        }

        openAt(handle, trigger) {
            var h = String(handle || '').toLowerCase();
            if (!this.byHandle.has(h)) { this.open(trigger); return; }
            this.setFilter(false, true);
            this.expanded.add(h);
            this.open(trigger);
            var row = this.list.querySelector('[data-handle="' + h + '"]');
            if (row && row.scrollIntoView) row.scrollIntoView({ block: 'start' });
            this.ensureVariants(h).then(() => this.focusRow(h));
        }

        focusRow(handle) {
            if (!this.root.open) return;
            var row = this.list.querySelector('[data-handle="' + handle + '"]');
            if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
            var target = row && (row.querySelector('input:not(:disabled)') || row.querySelector('.r3d-order-product-head'));
            if (target) target.focus();
        }

        close() {
            if (this.root.open) this.root.close();
        }

        setFilter(on, silent) {
            this.filterSelected = !!on;
            this.filterBtn.setAttribute('aria-pressed', this.filterSelected ? 'true' : 'false');
            this.filterBtn.classList.toggle('is-on', this.filterSelected);
            this.title.textContent = this.filterSelected ? this.strings.orderTitle : this.strings.orderPad;
            if (!silent) this.renderList();
        }

        // Which catalog product a page link points at, or '' — used by the
        // host's click routing for generated catalog cards.
        handleForUrl(href) {
            var h = handleFromUrl(href);
            return h && this.byHandle.has(h) ? h : '';
        }

        // ---- selection ---------------------------------------------------------

        totals() {
            var units = 0, lines = 0;
            this.selection.forEach(function (line) { units += line.quantity; lines += 1; });
            return { units: units, lines: lines };
        }

        countText(units, lines) {
            var st = this.strings;
            return fmt(st.orderCount, {
                units: fmt(units === 1 ? st.unitsOne : st.unitsOther, { n: units }),
                lines: fmt(lines === 1 ? st.linesOne : st.linesOther, { n: lines })
            });
        }

        setQuantity(variantId, quantity, meta) {
            var id = String(variantId);
            if (quantity <= 0) { this.selection.delete(id); return { ok: true }; }
            if (quantity > this.maxQuantity) return { ok: false, code: 'limitQuantity' };
            if (!this.selection.has(id) && this.selection.size >= this.maxLines) return { ok: false, code: 'limitLines' };
            this.selection.set(id, Object.assign({}, meta, { quantity: quantity }));
            return { ok: true };
        }

        parseQuantity(raw) {
            return parseQuantity(raw);
        }

        clearSelection() {
            this.selection.clear();
            this.renderCount();
        }

        // ---- variants ----------------------------------------------------------

        ensureVariants(handle) {
            var entry = this.variants.get(handle);
            if (entry && entry.status === 'loading') return entry.promise;
            if (entry && entry.status !== 'error') return Promise.resolve(entry);
            entry = { status: 'loading', variants: [] };
            this.variants.set(handle, entry);
            // Called from inside renderList for a row opened without cached
            // variants: that render already shows "Loading…", so do not start
            // a nested one (it would append every row twice).
            if (!this.rendering) this.renderList();
            entry.promise = this.transport.lookup(handle).then((res) => {
                var product = this.byHandle.get(handle) || {};
                var list = filterVariants(res && res.variants, product.allowedVariantIds);
                var status = res && res.status === 'unavailable' ? 'unavailable' : (res && res.status === 'error') ? 'error' : 'ok';
                var next = {
                    status: status,
                    variants: list,
                    truncated: !!(res && res.truncated),
                    url: res && typeof res.url === 'string' && /^https?:\/\/|^\//.test(res.url) ? res.url : ''
                };
                this.variants.set(handle, next);
                this.renderList();
                return next;
            }).catch(() => {
                var next = { status: 'error', variants: [] };
                this.variants.set(handle, next);
                this.renderList();
                return next;
            });
            return entry.promise;
        }

        // ---- rendering ---------------------------------------------------------

        renderCount() {
            var t = this.totals();
            var text = this.countText(t.units, t.lines);
            this.fabCount.textContent = String(t.units);
            this.fab.classList.toggle('has-items', t.units > 0);
            this.fab.setAttribute('aria-label', this.strings.orderTitle + ': ' + text);
            this.countLine.textContent = text;
            if (this.submitBtn && this.state === 'editing') this.submitBtn.disabled = t.units === 0;
        }

        renderList() {
            if (this.rendering) return;
            this.rendering = true;
            try { this.renderListNow(); } finally { this.rendering = false; }
        }

        renderListNow() {
            var focused = document.activeElement;
            var focusedId = focused && focused.getAttribute && focused.getAttribute('data-variant-id');
            this.list.textContent = '';
            var frozen = this.state !== 'editing';
            var groups = new Map();
            var order = [];
            this.products.forEach((p) => {
                var h = String(p.handle || '').toLowerCase();
                if (!h) return;
                if (this.filterSelected) {
                    var has = false;
                    this.selection.forEach(function (line) { if (line.handle === h) has = true; });
                    if (!has) return;
                }
                var g = p.chapter || '';
                if (!groups.has(g)) { groups.set(g, []); order.push(g); }
                groups.get(g).push(p);
            });
            if (!order.length) {
                this.list.appendChild(el('p', 'r3d-order-empty', this.filterSelected ? this.strings.selectedFilterEmpty : this.strings.empty));
                return;
            }
            order.forEach((g) => {
                if (g) this.list.appendChild(el('h3', 'r3d-order-chapter', g));
                groups.get(g).forEach((p) => this.list.appendChild(this.renderProduct(p, frozen)));
            });
            if (focusedId) {
                var again = this.list.querySelector('input[data-variant-id="' + focusedId + '"]');
                if (again) again.focus();
            }
        }

        renderProduct(p, frozen) {
            var st = this.strings;
            var h = String(p.handle).toLowerCase();
            var open = this.expanded.has(h) || this.filterSelected;
            var row = el('div', 'r3d-order-product' + (open ? ' is-open' : ''));
            row.setAttribute('data-handle', h);

            var head = el('button', 'r3d-order-product-head');
            head.type = 'button';
            head.setAttribute('aria-expanded', open ? 'true' : 'false');
            if (p.image) { var img = el('img', 'r3d-order-thumb'); img.src = p.image; img.alt = ''; head.appendChild(img); }
            var titleWrap = el('div', 'r3d-order-product-text');
            titleWrap.appendChild(el('div', 'r3d-order-product-title', p.title || h));
            var selUnits = 0;
            this.selection.forEach(function (line) { if (line.handle === h) selUnits += line.quantity; });
            titleWrap.appendChild(el('div', 'r3d-order-product-meta', selUnits ? this.countText(selUnits, this.linesFor(h)) : (p.variantCount > 1 ? fmt(st.variantCount, { n: p.variantCount }) : '')));
            head.appendChild(titleWrap);
            head.addEventListener('click', () => {
                if (this.expanded.has(h)) this.expanded.delete(h); else { this.expanded.add(h); this.ensureVariants(h); }
                this.renderList();
            });
            row.appendChild(head);

            if (open) {
                var body = el('div', 'r3d-order-product-body');
                var entry = this.variants.get(h);
                if (!entry) { this.ensureVariants(h); entry = this.variants.get(h); }
                if (entry.status === 'loading') body.appendChild(el('p', 'r3d-order-note', st.loading));
                else if (entry.status === 'unavailable') body.appendChild(el('p', 'r3d-order-note', st.notAvailable));
                else if (entry.status === 'error') {
                    body.appendChild(el('p', 'r3d-order-note', st.loadError));
                    var retry = el('button', 'r3d-order-link', st.checkAgain); retry.type = 'button';
                    retry.addEventListener('click', () => { this.variants.delete(h); this.ensureVariants(h); });
                    body.appendChild(retry);
                } else if (!entry.variants.length) body.appendChild(el('p', 'r3d-order-note', st.noVariants));
                else {
                    entry.variants.forEach((v) => body.appendChild(this.renderVariant(p, h, v, frozen)));
                    if (entry.truncated && entry.url) {
                        var rest = Math.max(1, (Number(p.variantCount) || 0) - entry.variants.length);
                        var more = el('a', 'r3d-order-link', fmt(st.moreVariants, { n: rest }));
                        more.href = entry.url; more.target = '_blank'; more.rel = 'noopener';
                        body.appendChild(more);
                    }
                }
                row.appendChild(body);
            }
            return row;
        }

        linesFor(handle) {
            var n = 0; this.selection.forEach(function (line) { if (line.handle === handle) n += 1; }); return n;
        }

        renderVariant(p, h, v, frozen) {
            var st = this.strings;
            var line = el('div', 'r3d-order-variant');
            var text = el('div', 'r3d-order-variant-text');
            text.appendChild(el('div', 'r3d-order-variant-title', v.title || p.title || h));
            var meta = [];
            if (v.sku) meta.push(st.sku + ' ' + v.sku);
            if (v.price) meta.push(String(v.price));
            if (meta.length) text.appendChild(el('div', 'r3d-order-variant-meta', meta.join(' · ')));
            line.appendChild(text);

            var current = this.selection.get(v.id);
            var landed = this.result && this.result.landed ? this.result.landed[v.id] : undefined;
            if (this.state === 'partial' && current) {
                text.appendChild(el('div', 'r3d-order-variant-landed', fmt(st.inCart, { added: landed || 0, requested: current.quantity })));
            }

            var input = el('input', 'r3d-order-qty');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.setAttribute('aria-label', st.quantity + ' — ' + (v.title || p.title || h));
            input.setAttribute('data-variant-id', v.id);
            input.value = current ? String(current.quantity) : '';
            input.placeholder = '0';
            input.disabled = frozen || !v.available;
            var err = el('div', 'r3d-order-qty-error');
            err.id = 'r3d-order-err-' + v.id;
            var commit = () => {
                var parsed = this.parseQuantity(input.value);
                if (parsed.ok) {
                    var r = this.setQuantity(v.id, parsed.quantity, { handle: h, productTitle: p.title || h, variantTitle: v.title || '', sku: v.sku || '', price: v.price });
                    if (r.ok) { input.value = parsed.quantity ? String(parsed.quantity) : ''; err.textContent = ''; input.removeAttribute('aria-invalid'); this.renderCount(); this.updateProductMeta(h); return; }
                    parsed = r;
                }
                err.textContent = fmt(st[parsed.code] || st.invalidQuantity, { n: parsed.code === 'limitLines' ? this.maxLines : this.maxQuantity });
                input.setAttribute('aria-invalid', 'true');
                input.setAttribute('aria-describedby', err.id);
            };
            input.addEventListener('change', commit);
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
            if (!v.available) text.appendChild(el('div', 'r3d-order-variant-meta', st.notAvailable));
            var qtyWrap = el('div', 'r3d-order-qty-wrap');
            qtyWrap.appendChild(input);
            qtyWrap.appendChild(err);
            line.appendChild(qtyWrap);
            return line;
        }

        updateProductMeta(h) {
            var row = this.list.querySelector('[data-handle="' + h + '"] .r3d-order-product-meta');
            if (!row) return;
            var units = 0; this.selection.forEach(function (line) { if (line.handle === h) units += line.quantity; });
            var p = this.byHandle.get(h) || {};
            row.textContent = units ? this.countText(units, this.linesFor(h)) : (p.variantCount > 1 ? fmt(this.strings.variantCount, { n: p.variantCount }) : '');
        }

        renderFooter() {
            var st = this.strings;
            this.actions.textContent = '';
            var mk = (label, cls, fn, primary) => {
                var b = el('button', 'r3d-order-btn' + (primary ? ' is-primary' : '') + (cls ? ' ' + cls : ''), label);
                b.type = 'button'; b.addEventListener('click', fn); this.actions.appendChild(b); return b;
            };
            this.submitBtn = null;
            this.status.textContent = '';
            switch (this.state) {
                case 'editing':
                    this.submitBtn = mk(st.addAllToCart, '', () => this.submit(), true);
                    this.submitBtn.disabled = this.totals().units === 0;
                    // A failed batch returns here with Shopify's message; the
                    // host has archived it, so a new submit is a new batch.
                    this.status.textContent = this.result && this.result.state === 'failed'
                        ? st.failed + (this.result.message ? ' ' + this.result.message : '')
                        : '';
                    break;
                case 'submitting':
                    this.status.textContent = st.adding;
                    break;
                case 'confirmed':
                    this.status.textContent = st.confirmed;
                    mk(st.viewCart, '', () => this.transport.viewCart(), true);
                    mk(st.continueBrowsing, '', () => { this.clearSelection(); this.setState('editing'); this.close(); });
                    break;
                case 'partial':
                    this.status.textContent = st.partial;
                    mk(st.viewCart, '', () => this.transport.viewCart(), true);
                    mk(st.startNewOrder, '', () => { this.clearSelection(); this.result = null; this.setState('editing'); });
                    break;
                case 'unknown':
                    this.status.textContent = st.unknown;
                    mk(st.checkAgain, '', () => this.check(), true);
                    mk(st.viewCart, '', () => this.transport.viewCart());
                    if (this.canStartOver()) {
                        mk(st.startOver, 'is-danger', () => this.startOver());
                        this.status.textContent = st.unknown + ' ' + st.lateArrival;
                    }
                    break;
            }
        }

        setState(state) {
            this.state = state;
            if (state === 'editing') { this.batchId = null; this.unknownSince = 0; this.lastCheckAt = 0; this.lastCheckLanded = null; }
            this.renderFooter();
            this.renderList();
        }

        // "Start over" is offered only after sixty seconds in unknown AND a
        // read-back made after that minute that still found nothing.
        canStartOver() {
            return this.state === 'unknown' && this.unknownSince > 0 && this.lastCheckAt - this.unknownSince >= 60000 && this.lastCheckLanded === 0;
        }

        // ---- submission --------------------------------------------------------

        submit() {
            if (this.state !== 'editing') return;
            var items = [];
            this.selection.forEach(function (line, id) { items.push({ variantId: id, quantity: line.quantity, handle: line.handle }); });
            if (!items.length) return;
            this.batchId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
            this.result = null;
            this.setState('submitting');
            this.transport.submit({ batchId: this.batchId, items: items }).then((res) => this.applyResult(res)).catch((err) => this.applySubmitError(err));
        }

        // A coded refusal from the host is a known outcome: nothing was sent.
        // "pending" means an earlier batch is still unresolved — resume it.
        // Anything without a code (a timeout, a lost reply) is uncertain.
        applySubmitError(err) {
            var code = err && err.code;
            if (code === 'pending' && err.data && err.data.batchId) { this.resumePending(err.data); return; }
            if (code && code !== 'timeout') { this.applyResult({ state: 'failed', landed: {}, message: err.message || '' }); return; }
            this.applyResult({ state: 'unknown', landed: {} });
        }

        // A batch left unresolved in the host's session record (the page was
        // reloaded while unknown): show its status and re-run the read-back.
        resumePending(p) {
            if (!p || !p.batchId) return;
            this.batchId = String(p.batchId);
            this.result = { state: 'unknown', landed: {}, message: '' };
            this.unknownSince = Number(p.startedAt) > 0 ? Number(p.startedAt) : Date.now();
            this.lastCheckAt = 0;
            this.lastCheckLanded = null;
            this.state = 'unknown';
            this.renderFooter();
            this.renderList();
            this.open();
            this.check();
        }

        applyResult(res) {
            var state = res && ['confirmed', 'partial', 'failed', 'unknown'].indexOf(res.state) !== -1 ? res.state : 'unknown';
            this.result = { state: state, landed: (res && res.landed) || {}, message: res && res.message ? String(res.message) : '' };
            if (state === 'unknown') {
                var now = Date.now();
                if (!this.unknownSince) this.unknownSince = now;
                this.lastCheckAt = now;
                var total = 0; Object.keys(this.result.landed).forEach((k) => { total += Number(this.result.landed[k]) || 0; });
                this.lastCheckLanded = total;
            }
            // failed: nothing landed and the host archived the batch — back to editing with the message.
            this.setState(state === 'failed' ? 'editing' : state);
        }

        check() {
            if (!this.batchId) return;
            this.transport.check(this.batchId).then((res) => this.applyResult(res)).catch(() => this.applyResult({ state: 'unknown', landed: {} }));
        }

        startOver() {
            if (!this.canStartOver()) return;
            var id = this.batchId;
            Promise.resolve(this.transport.release(id)).catch(function () { /* host keeps the batch either way */ }).then(() => {
                this.clearSelection();
                this.result = null;
                this.setState('editing');
            });
        }

        destroy() {
            if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
            if (this.fab && this.fab.parentNode) this.fab.parentNode.removeChild(this.fab);
        }
    };

    FLIPBOOK.orderHandleFromUrl = handleFromUrl;
    FLIPBOOK.orderParseQuantity = parseQuantity;
    FLIPBOOK.orderFilterVariants = filterVariants;
})();
