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
 *
 * Request mode (config.mode === 'request'): wholesale order requests instead
 * of the cart. lookup() variants carry tiers [{ min, price }], moq and
 * tax { rate, hsn }; the pad prices each line from the tiers, previews GST
 * (config.tax) and collects contact details, then calls
 *   submitRequest({ requestId, items, contact }) → { number } or rejects with { code, message, lines? }
 * The server prices and taxes the order again; the pad only previews.
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
        selectedFilterEmpty: 'Nothing selected yet.',
        priceOnRequest: 'Price on request',
        minOrder: 'Min. {n}',
        belowMin: 'Minimum order is {n}.',
        nextTier: '{price} from {n}',
        eachPrice: '{price} each',
        lineTotal: 'Total {price}',
        subtotal: 'Subtotal',
        gst: 'GST',
        cgst: 'CGST',
        sgst: 'SGST',
        utgst: 'UTGST',
        igst: 'IGST',
        total: 'Total',
        plusOnRequest: 'Plus {n} priced on request',
        gstNotSet: 'GST not set for {n}',
        gstPreview: 'GST is split into CGST and SGST, or IGST, once you choose the delivery state.',
        shippingNote: 'Shipping and packaging charges will be extra and will be added to the final invoice.',
        continueOrder: 'Continue',
        back: 'Back',
        submitOrder: 'Submit order',
        detailsTitle: 'Your details',
        name: 'Name',
        company: 'Company',
        phone: 'Phone',
        email: 'Email',
        deliveryState: 'Delivery state',
        chooseState: 'Choose a state',
        gstin: 'GSTIN (optional)',
        note: 'Note (optional)',
        required: 'Required',
        invalidEmail: 'Enter a valid email address.',
        invalidGstin: 'Enter a valid 15-character GSTIN.',
        sending: 'Sending your order…',
        received: 'Order {number} received. We\'ll be in touch.',
        receivedNoNumber: 'Order received. We\'ll be in touch.',
        requestFailed: 'Your order could not be sent. Try again.',
        rateLimited: 'Too many orders, try again later.',
        linesChanged: 'Some lines changed. Check the marked rows and send again.',
        newOrder: 'Start a new order',
        addedToOrder: 'Added to order · {n}',
        viewOrder: 'View order',
        inOrder: 'In order · {n}',
        decreaseQuantity: 'Decrease quantity',
        increaseQuantity: 'Increase quantity'
    };

    var STATE_FIELDS = ['name', 'company', 'phone', 'email', 'deliveryState', 'gstin', 'note'];
    var FIELD_MAX = { name: 100, company: 120, phone: 30, email: 254, gstin: 15, note: 500 };
    var UTGST_STATES = ['04', '26', '31', '35', '38'];
    var GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // A Shopify money format ("₹ {{amount}}", "Rs. {{amount_no_decimals}}")
    // applied to a "1234.50" string. Markup in the format is dropped.
    function formatMoney(amount, format) {
        var f = String(format || '').replace(/<[^>]*>/g, '');
        if (!/\{\{\s*\w+\s*\}\}/.test(f)) f = '{{amount}}';
        var m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(String(amount));
        if (!m) return String(amount);
        var sign = m[1], whole = m[2], cents = (m[3] || '').concat('00').slice(0, 2);
        var group = function (w, sep) { return w.replace(/\B(?=(\d{3})+(?!\d))/g, sep); };
        var rounded = String(Math.round(Number(whole + '.' + cents)));
        return f.replace(/\{\{\s*(\w+)\s*\}\}/, function (x, k) {
            switch (k) {
                case 'amount_no_decimals': return sign + group(rounded, ',');
                case 'amount_with_comma_separator': return sign + group(whole, '.') + ',' + cents;
                case 'amount_no_decimals_with_comma_separator': return sign + group(rounded, '.');
                case 'amount_with_apostrophe_separator': return sign + group(whole, "'") + '.' + cents;
                case 'amount_no_decimals_with_space_separator': return sign + group(rounded, ' ');
                case 'amount_with_space_separator': return sign + group(whole, ' ') + ',' + cents;
                default: return sign + group(whole, ',') + '.' + cents;
            }
        });
    }

    // Tiers as served: [{ min, price: "400.00" }], sorted, junk dropped.
    function cleanTiers(list) {
        var out = [];
        (Array.isArray(list) ? list : []).forEach(function (t) {
            if (!t) return;
            var min = Number(t.min);
            var price = String(t.price == null ? '' : t.price);
            if (!Number.isInteger(min) || min < 1 || !/^\d{1,10}(\.\d{1,2})?$/.test(price)) return;
            if (out.some(function (o) { return o.min === min; })) return;
            out.push({ min: min, price: price });
        });
        return out.sort(function (a, b) { return a.min - b.min; });
    }

    function tierFor(tiers, qty) {
        var hit = null;
        (tiers || []).forEach(function (t) { if (qty >= t.min) hit = t; });
        return hit;
    }

    function toCents(price) {
        var m = /^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(price == null ? '' : price));
        if (!m) return null;
        return BigInt(m[1]) * 100n + BigInt((m[2] || '').concat('00').slice(0, 2));
    }

    function centsToString(c) {
        var neg = c < 0n, v = neg ? -c : c;
        return (neg ? '-' : '') + (v / 100n).toString() + '.' + String(v % 100n).padStart(2, '0');
    }

    // Same rules as the server (utils/order-requests.js computeOrderTotals):
    // per-line rounding; same state → CGST + SGST (UTGST in a union
    // territory) at half the rate each, else IGST; no state yet → GST total.
    function orderTotals(lines, tax, deliveryState) {
        var gst = !!(tax && tax.mode === 'india_gst');
        var storeState = gst ? String(tax.storeState || '') : '';
        var split = !gst || !deliveryState ? null : (deliveryState === storeState ? 'intra' : 'inter');
        var subtotal = 0n, half = 0n, igst = 0n, onRequest = 0, taxUnset = 0;
        lines.forEach(function (l) {
            var unit = l.price == null ? null : toCents(l.price);
            if (unit === null) { onRequest += 1; return; }
            var taxable = unit * BigInt(l.quantity);
            subtotal += taxable;
            if (!gst) return;
            if (l.rate == null || !isFinite(Number(l.rate))) { taxUnset += 1; return; }
            var bp = BigInt(Math.round(Number(l.rate) * 100));
            if (split === 'intra') half += (taxable * bp + 10000n) / 20000n;
            else igst += (taxable * bp + 5000n) / 10000n;
        });
        var taxTotal = half * 2n + igst;
        return {
            gst: gst,
            split: split,
            stateLabel: split === 'intra' && UTGST_STATES.indexOf(storeState) !== -1 ? 'utgst' : 'sgst',
            subtotal: centsToString(subtotal),
            half: centsToString(half),
            igst: centsToString(igst),
            tax: centsToString(taxTotal),
            total: centsToString(subtotal + taxTotal),
            onRequest: onRequest,
            taxUnset: taxUnset
        };
    }

    function validGstin(value) {
        var s = String(value || '').trim().toUpperCase();
        if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s)) return false;
        var sum = 0;
        for (var i = 0; i < 14; i++) {
            var p = GSTIN_CHARS.indexOf(s[i]) * (i % 2 ? 2 : 1);
            sum += Math.floor(p / 36) + (p % 36);
        }
        return GSTIN_CHARS[(36 - (sum % 36)) % 36] === s[14];
    }

    function validEmail(value) {
        var s = String(value || '').trim();
        return s.length <= 254 && /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(s);
    }

    function uuid4() {
        var c = window.crypto;
        if (c && typeof c.randomUUID === 'function') return c.randomUUID();
        var b = new Uint8Array(16);
        if (c && c.getRandomValues) c.getRandomValues(b); else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
        b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
        var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
        return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
    }

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
            var item = { id: id, title: String(v.title || ''), sku: String(v.sku || ''), available: v.available !== false, price: v.price };
            if (v.tiers !== undefined) {
                item.tiers = cleanTiers(v.tiers);
                item.moq = item.tiers.length ? item.tiers[0].min : 1;
                var rate = v.tax && v.tax.rate != null && isFinite(Number(v.tax.rate)) ? Number(v.tax.rate) : null;
                item.rate = rate;
                item.hsn = v.tax && typeof v.tax.hsn === 'string' ? v.tax.hsn : '';
            }
            out.push(item);
        });
        return out;
    }

    FLIPBOOK.OrderPanel = class {
        constructor(config, transport, strings) {
            this.config = config || {};
            this.transport = transport;
            this.maxLines = Number(this.config.maxLines) || 100;
            this.request = this.config.mode === 'request';
            this.inline = this.request && this.config.inline === true;
            this.slots = [];
            this.maxQuantity = Number(this.config.maxQuantity) || (this.request ? 9999 : 999);
            this.tax = this.request && this.config.tax && this.config.tax.mode === 'india_gst' ? this.config.tax : null;
            this.states = this.tax && Array.isArray(this.config.tax.states) ? this.config.tax.states.filter(function (x) { return x && /^\d{2}$/.test(String(x.code)) && x.name; }) : [];
            this.moneyFormat = typeof this.config.moneyFormat === 'string' ? this.config.moneyFormat : '';
            this.lineErrors = {};
            this.products = Array.isArray(this.config.products) ? this.config.products : [];
            this.byHandle = new Map();
            this.products.forEach(function (p) { if (p && p.handle) this.byHandle.set(String(p.handle).toLowerCase(), p); }, this);
            this.strings = Object.assign({}, DEFAULTS);
            var s = strings || {};
            Object.keys(DEFAULTS).forEach(function (k) {
                if (typeof s[k] === 'string' && s[k]) this.strings[k] = s[k];
            }, this);
            if (this.request && typeof this.config.shippingNote === 'string' && this.config.shippingNote.trim()) {
                this.strings.shippingNote = this.config.shippingNote.trim();
            }
            this.contact = this.request ? this.loadContact() : {};

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
            this.priceNote = el('div', 'r3d-order-pricenote', this.request ? '' : st.reviewPrices);
            this.summary = el('div', 'r3d-order-summary');
            this.actions = el('div', 'r3d-order-actions');
            foot.appendChild(this.summary);
            foot.appendChild(this.priceNote);
            foot.appendChild(this.actions);
            if (this.request) this.root.classList.add('is-request');

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
            this.renderSummary();
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
            if (quantity <= 0) { if (this.selection.delete(id)) this.requestId = null; return { ok: true }; }
            if (quantity > this.maxQuantity) return { ok: false, code: 'limitQuantity' };
            if (!this.selection.has(id) && this.selection.size >= this.maxLines) return { ok: false, code: 'limitLines' };
            this.requestId = null;
            this.selection.set(id, Object.assign({}, meta, { quantity: quantity }));
            delete this.lineErrors[id];
            return { ok: true };
        }

        parseQuantity(raw) {
            return parseQuantity(raw);
        }

        clearSelection() {
            this.selection.clear();
            this.lineErrors = {};
            this.renderCount();
        }

        // ---- request mode: prices, totals, contact ------------------------------

        money(amount) {
            return formatMoney(amount, this.moneyFormat);
        }

        // The unit price for a selected line, or null (price on request or
        // below the minimum).
        linePrice(line) {
            var t = tierFor(line.tiers, line.quantity);
            return t ? t.price : null;
        }

        belowMinLines() {
            var n = 0;
            this.selection.forEach(function (line) { if (line.tiers && line.tiers.length && line.quantity < line.moq) n += 1; });
            return n;
        }

        requestTotals() {
            var lines = [];
            this.selection.forEach((line) => {
                if (line.tiers && line.tiers.length && line.quantity < line.moq) return;
                lines.push({ quantity: line.quantity, price: this.linePrice(line), rate: line.rate });
            });
            return orderTotals(lines, this.tax, this.contact.deliveryState || '');
        }

        prefillContact(c) {
            if (!this.request || !c || typeof c !== 'object') return;
            var changed = false;
            ['name', 'email', 'phone'].forEach((k) => {
                if (this.contact[k] || typeof c[k] !== 'string' || !c[k].trim()) return;
                this.contact[k] = c[k].trim().slice(0, FIELD_MAX[k]);
                changed = true;
            });
            if (changed && this.state === 'details') this.renderList();
        }

        contactKey() {
            return 'r3dOrderContact:' + String(this.config.flipbookId || '');
        }

        loadContact() {
            var c = {};
            try {
                var raw = window.sessionStorage && window.sessionStorage.getItem(this.contactKey());
                var v = raw ? JSON.parse(raw) : null;
                if (v && typeof v === 'object') STATE_FIELDS.forEach(function (k) { if (typeof v[k] === 'string') c[k] = v[k].slice(0, FIELD_MAX[k] || 2); });
            } catch (e) { /* storage blocked */ }
            if (c.deliveryState && !this.states.some(function (x) { return x.code === c.deliveryState; })) delete c.deliveryState;
            return c;
        }

        saveContact() {
            try {
                var keep = {};
                STATE_FIELDS.forEach((k) => { if (k !== 'note' && this.contact[k]) keep[k] = this.contact[k]; });
                if (window.sessionStorage) window.sessionStorage.setItem(this.contactKey(), JSON.stringify(keep));
            } catch (e) { /* storage blocked or full */ }
        }

        // field → error string, empty when the form can be sent.
        contactErrors() {
            var st = this.strings, c = this.contact, out = {};
            if (!String(c.name || '').trim()) out.name = st.required;
            if (!String(c.phone || '').trim()) out.phone = st.required;
            if (!String(c.email || '').trim()) out.email = st.required;
            else if (!validEmail(c.email)) out.email = st.invalidEmail;
            if (this.tax && !c.deliveryState) out.deliveryState = st.required;
            if (this.tax && c.gstin && !validGstin(c.gstin)) out.gstin = st.invalidGstin;
            return out;
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
            if (this.submitBtn && this.state === 'editing') this.submitBtn.disabled = t.units === 0 || (this.request && this.belowMinLines() > 0);
            this.slots.forEach((s) => this.renderSlot(s));
        }

        renderList() {
            if (this.rendering) return;
            this.rendering = true;
            try { this.renderListNow(); } finally { this.rendering = false; }
        }

        renderListNow() {
            var focused = document.activeElement;
            var attr = (n) => (focused && focused.getAttribute && this.list.contains(focused) ? focused.getAttribute(n) : null);
            var focusedId = attr('data-variant-id');
            var focusedField = attr('data-field');
            var focusedKey = attr('data-focus');
            var withContact = this.request && (this.state === 'details' || this.state === 'sending');
            this.list.textContent = '';
            this.renderProducts();
            if (withContact) this.renderContact();
            var again = focusedId ? this.list.querySelector('input[data-variant-id="' + focusedId + '"]')
                : focusedField ? this.list.querySelector('[data-field="' + focusedField + '"]')
                : focusedKey ? this.list.querySelector('[data-focus="' + focusedKey + '"]') : null;
            if (again && !again.disabled) again.focus();
        }

        renderProducts() {
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
        }

        renderProduct(p, frozen) {
            var st = this.strings;
            var h = String(p.handle).toLowerCase();
            var open = this.expanded.has(h) || this.filterSelected;
            var row = el('div', 'r3d-order-product' + (open ? ' is-open' : ''));
            row.setAttribute('data-handle', h);

            var head = el('button', 'r3d-order-product-head');
            head.type = 'button';
            head.setAttribute('data-focus', 'h:' + h);
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

        lineMeta(p, h, v) {
            var m = { handle: h, productTitle: p.title || h, variantTitle: v.title || '', sku: v.sku || '', price: v.price };
            if (this.request) { m.tiers = v.tiers || []; m.moq = v.moq || 1; m.rate = v.rate; m.hsn = v.hsn || ''; }
            return m;
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
            if (v.price && !this.request) meta.push(String(v.price));
            if (meta.length) text.appendChild(el('div', 'r3d-order-variant-meta', meta.join(' · ')));
            line.appendChild(text);

            var current = this.selection.get(v.id);
            var tierBox = el('div', 'r3d-order-tier');
            if (this.request) { this.renderTierInfo(tierBox, v, current); text.appendChild(tierBox); }
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
            var meta = () => this.lineMeta(p, h, v);
            var live = () => {
                var parsed = this.parseQuantity(input.value);
                if (!parsed.ok || !this.setQuantity(v.id, parsed.quantity, meta()).ok) return;
                this.renderCount(); this.updateProductMeta(h);
                if (!this.request) return;
                var cur = this.selection.get(v.id);
                tierBox.textContent = '';
                this.renderTierInfo(tierBox, v, cur);
                var below = cur && v.tiers && v.tiers.length && cur.quantity < v.moq;
                err.textContent = below ? fmt(st.belowMin, { n: v.moq }) : '';
                if (below) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
                else input.removeAttribute('aria-invalid');
                this.renderSummary();
            };
            var commit = (later) => {
                var parsed = this.parseQuantity(input.value);
                if (parsed.ok) {
                    var r = this.setQuantity(v.id, parsed.quantity, meta());
                    if (r.ok) {
                        input.value = parsed.quantity ? String(parsed.quantity) : ''; err.textContent = ''; input.removeAttribute('aria-invalid');
                        this.renderCount(); this.updateProductMeta(h);
                        if (this.request) {
                            this.renderSummary();
                            if (later) setTimeout(() => { if (this.state === 'editing') this.renderList(); }, 0);
                            else this.renderList();
                        }
                        return;
                    }
                    parsed = r;
                }
                err.textContent = fmt(st[parsed.code] || st.invalidQuantity, { n: parsed.code === 'limitLines' ? this.maxLines : this.maxQuantity });
                input.setAttribute('aria-invalid', 'true');
                input.setAttribute('aria-describedby', err.id);
            };
            input.addEventListener('input', live);
            input.addEventListener('change', () => commit(true));
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(false); } });
            if (!v.available) text.appendChild(el('div', 'r3d-order-variant-meta', st.notAvailable));
            if (this.request && current) {
                var rowErr = this.lineErrors[v.id] ? this.lineErrors[v.id]
                    : (v.tiers && v.tiers.length && current.quantity < v.moq ? fmt(st.belowMin, { n: v.moq }) : '');
                if (rowErr) {
                    err.textContent = rowErr;
                    input.setAttribute('aria-invalid', 'true');
                    input.setAttribute('aria-describedby', err.id);
                }
            }
            var qtyWrap = el('div', 'r3d-order-qty-wrap');
            qtyWrap.appendChild(input);
            qtyWrap.appendChild(err);
            line.appendChild(qtyWrap);
            return line;
        }

        // Unit price for the quantity entered (or the first tier), minimum
        // order, the next tier's price and the line total.
        renderTierInfo(text, v, current) {
            var st = this.strings;
            var tiers = v.tiers || [];
            if (!tiers.length) { text.appendChild(el('div', 'r3d-order-price is-muted', st.priceOnRequest)); return; }
            var qty = current ? current.quantity : 0;
            var tier = tierFor(tiers, qty) || tiers[0];
            var bits = [fmt(st.eachPrice, { price: this.money(tier.price) })];
            if (v.moq > 1) bits.push(fmt(st.minOrder, { n: v.moq }));
            text.appendChild(el('div', 'r3d-order-price', bits.join(' · ')));
            var next = null;
            tiers.forEach(function (t) { if (!next && t.min > Math.max(qty, tier.min)) next = t; });
            var extra = [];
            if (next) extra.push(fmt(st.nextTier, { price: this.money(next.price), n: next.min }));
            var unit = qty >= v.moq ? tierFor(tiers, qty) : null;
            if (unit) extra.push(fmt(st.lineTotal, { price: this.money(centsToString(toCents(unit.price) * BigInt(qty))) }));
            if (extra.length) text.appendChild(el('div', 'r3d-order-variant-meta', extra.join(' · ')));
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
            if (this.request) { this.renderRequestFooter(mk); return; }
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

        renderRequestFooter(mk) {
            var st = this.strings;
            this.renderSummary();
            var inDetails = this.state === 'details' || this.state === 'sending';
            this.title.textContent = inDetails ? st.detailsTitle : (this.filterSelected ? st.orderTitle : st.orderPad);
            this.filterBtn.hidden = inDetails;
            switch (this.state) {
                case 'editing':
                    this.submitBtn = mk(st.continueOrder, '', () => this.toDetails(), true);
                    this.submitBtn.disabled = this.totals().units === 0 || this.belowMinLines() > 0;
                    if (this.result && this.result.message) this.status.textContent = this.result.message;
                    break;
                case 'details':
                    this.submitBtn = mk(st.submitOrder, '', () => this.submitRequest(), true);
                    mk(st.back, '', () => { this.result = null; this.setState('editing'); });
                    if (this.result && this.result.message) this.status.textContent = this.result.message;
                    break;
                case 'sending':
                    this.status.textContent = st.sending;
                    break;
                case 'received':
                    this.status.textContent = this.result && this.result.number ? fmt(st.received, { number: this.result.number }) : st.receivedNoNumber;
                    mk(st.continueBrowsing, '', () => { this.clearSelection(); this.result = null; this.setState('editing'); this.close(); }, true);
                    mk(st.newOrder, '', () => { this.clearSelection(); this.result = null; this.setState('editing'); });
                    break;
            }
        }

        // Subtotal, GST lines, total and the shipping note. Built with
        // textContent only: the note is the merchant's plain text.
        renderSummary() {
            if (!this.request || !this.summary) return;
            var st = this.strings;
            this.summary.textContent = '';
            var t = this.requestTotals();
            var row = (label, value, cls) => {
                var r = el('div', 'r3d-order-sum-row' + (cls ? ' ' + cls : ''));
                r.appendChild(el('span', '', label));
                r.appendChild(el('span', '', value));
                this.summary.appendChild(r);
            };
            if (this.state !== 'received') {
                row(st.subtotal, this.money(t.subtotal));
                if (t.gst) {
                    if (t.split === 'intra') {
                        row(st.cgst, this.money(t.half));
                        row(st[t.stateLabel], this.money(t.half));
                    } else if (t.split === 'inter') {
                        row(st.igst, this.money(t.igst));
                    } else {
                        row(st.gst, this.money(t.tax));
                    }
                }
                row(st.total, this.money(t.total), 'is-total');
                if (t.onRequest) this.summary.appendChild(el('div', 'r3d-order-sum-note', fmt(st.plusOnRequest, { n: t.onRequest })));
                if (t.taxUnset) this.summary.appendChild(el('div', 'r3d-order-sum-note', fmt(st.gstNotSet, { n: t.taxUnset })));
                if (t.gst && !t.split && this.state === 'editing') this.summary.appendChild(el('div', 'r3d-order-sum-note', st.gstPreview));
            }
            this.summary.appendChild(el('div', 'r3d-order-sum-note', st.shippingNote));
        }

        toDetails() {
            if (this.state !== 'editing' || !this.totals().units || this.belowMinLines()) return;
            this.result = null;
            this.setState('details');
        }

        renderContact() {
            var st = this.strings;
            var errors = this.showContactErrors ? this.contactErrors() : {};
            var form = el('div', 'r3d-order-form');
            var frozen = this.state !== 'details';
            var field = (key, label, type) => {
                var wrap = el('label', 'r3d-order-field');
                wrap.appendChild(el('span', 'r3d-order-field-label', label));
                var input;
                if (type === 'state') {
                    input = el('select', 'r3d-order-input');
                    var first = el('option', '', st.chooseState); first.value = ''; input.appendChild(first);
                    this.states.forEach(function (x) { var o = el('option', '', x.name); o.value = x.code; input.appendChild(o); });
                } else if (type === 'textarea') {
                    input = el('textarea', 'r3d-order-input'); input.rows = 3;
                } else {
                    input = el('input', 'r3d-order-input'); input.type = type || 'text';
                }
                if (FIELD_MAX[key]) input.maxLength = FIELD_MAX[key];
                if (key === 'email') input.autocomplete = 'email';
                if (key === 'name') input.autocomplete = 'name';
                if (key === 'phone') input.autocomplete = 'tel';
                if (key === 'company') input.autocomplete = 'organization';
                if (key === 'gstin') { input.autocapitalize = 'characters'; input.spellcheck = false; input.style.textTransform = 'uppercase'; }
                input.value = this.contact[key] || '';
                input.disabled = frozen;
                input.setAttribute('data-field', key);
                var update = () => {
                    this.contact[key] = key === 'gstin' ? input.value.trim().toUpperCase() : input.value;
                    if (key === 'deliveryState') this.renderSummary();
                };
                input.addEventListener('input', update);
                input.addEventListener('change', update);
                wrap.appendChild(input);
                var e = el('span', 'r3d-order-qty-error', errors[key] || '');
                if (errors[key]) input.setAttribute('aria-invalid', 'true');
                wrap.appendChild(e);
                form.appendChild(wrap);
            };
            field('name', st.name);
            field('company', st.company);
            field('phone', st.phone, 'tel');
            field('email', st.email, 'email');
            if (this.tax) {
                field('deliveryState', st.deliveryState, 'state');
                field('gstin', st.gstin);
            }
            field('note', st.note, 'textarea');
            this.list.appendChild(form);
        }

        submitRequest() {
            if (this.state !== 'details') return;
            var errors = this.contactErrors();
            if (Object.keys(errors).length) {
                this.showContactErrors = true;
                this.renderList();
                var bad = this.list.querySelector('[aria-invalid="true"]');
                if (bad) bad.focus();
                return;
            }
            this.showContactErrors = false;
            var items = [];
            this.selection.forEach(function (line, id) { items.push({ variantId: id, quantity: line.quantity, handle: line.handle }); });
            if (!items.length) return;
            var contact = {};
            STATE_FIELDS.forEach((k) => {
                var v = String(this.contact[k] || '').trim();
                if (v) contact[k] = v.slice(0, FIELD_MAX[k] || 2);
            });
            this.saveContact();
            if (!this.requestId) this.requestId = uuid4();
            this.result = null;
            this.setState('sending');
            this.transport.submitRequest({ requestId: this.requestId, items: items, contact: contact }).then((res) => {
                this.requestId = null;
                this.result = { number: res && res.number ? String(res.number) : '' };
                this.setState('received');
            }).catch((err) => {
                var code = err && err.code;
                var st = this.strings;
                if (code === 'lines' && err.data && err.data.lines && typeof err.data.lines === 'object') {
                    this.lineErrors = {};
                    Object.keys(err.data.lines).forEach((id) => { this.lineErrors[id] = String(err.data.lines[id] || st.linesChanged); });
                    this.requestId = null;
                    this.result = { message: st.linesChanged };
                    this.setFilter(true, true);
                    this.setState('editing');
                    return;
                }
                // Same request id on a retry: the server answers with the
                // order it already stored instead of making a second one.
                this.result = { message: code === 'rate_limited' ? st.rateLimited : (err && err.message && code !== 'timeout' ? String(err.message) : st.requestFailed) };
                this.setState('details');
            });
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

        // ---- catalog card slots and hotspot add --------------------------------

        // Variant v of handle into the order: at least its minimum, plus
        // extra on top of what is already there. Returns the new quantity, or 0.
        addVariant(handle, v, extra) {
            var cur = this.selection.get(v.id);
            var q = Math.max(v.moq || 1, (cur ? cur.quantity : 0) + extra);
            return this.setQuantity(v.id, q, this.lineMeta(this.byHandle.get(handle) || {}, handle, v)).ok ? q : 0;
        }

        variantFor(entry, id) {
            var v = entry && entry.status === 'ok' ? entry.variants.filter(function (x) { return x.id === id; })[0] : null;
            return v && v.available ? v : null;
        }

        bindSlots(root) {
            if (!this.inline) return;
            var found = (root || document).querySelectorAll('[data-r3d-order-slot]');
            Array.prototype.forEach.call(found, (slot) => {
                if (slot._r3dSlot || slot.getAttribute('data-r3d-order-slot') === 'preview') return;
                var link = slot.parentNode && slot.parentNode.querySelector('a[href]');
                var href = link ? link.getAttribute('href') : '';
                var h = this.handleForUrl(href);
                if (!h) return;
                var m = href.match(/[?&]variant=(\d+)/);
                var s = { el: slot, handle: h, fixed: !!m, variantId: m ? m[1] : '', busy: false, box: el('div', 'r3d-slot') };
                s.box.setAttribute('data-html2canvas-ignore', '');
                slot.appendChild(s.box);
                ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'dblclick'].forEach(function (t) {
                    slot.addEventListener(t, function (e) { e.stopPropagation(); });
                });
                slot.addEventListener('click', (e) => this.slotClick(s, e));
                slot._r3dSlot = s;
                this.slots.push(s);
                this.renderSlot(s);
            });
        }

        slotClick(s, e) {
            var t = e.target;
            if (!t || !t.closest) return;
            if (this.state !== 'editing') { this.openAt(s.handle, t); return; }
            var thumb = t.closest('[data-r3d-variant]');
            if (thumb && !s.fixed) { s.variantId = numericId(thumb.getAttribute('data-r3d-variant')); this.renderSlot(s); return; }
            var act = t.closest('[data-act]');
            var a = act && act.getAttribute('data-act');
            if (a === 'add') this.slotAdd(s, act);
            else if (a === 'open') this.openAt(s.handle, act);
            else if (a === 'dec' || a === 'inc') {
                var line = this.selection.get(s.variantId);
                if (!line) return;
                var q = line.quantity + (a === 'inc' ? 1 : -1);
                if (a === 'dec' && q < (line.moq || 1)) q = 0;
                this.slotSet(s, q, act);
            }
        }

        slotSet(s, q, trigger) {
            var line = this.selection.get(s.variantId);
            if (!line) return;
            if (q > 0 && q < (line.moq || 1)) q = line.moq;
            if (!this.setQuantity(s.variantId, q, line).ok) { this.renderSlot(s); this.openAt(s.handle, trigger); return; }
            this.renderCount();
        }

        slotAdd(s, trigger) {
            if (s.busy) return;
            s.busy = true;
            this.renderSlot(s);
            this.ensureVariants(s.handle).then((entry) => {
                s.busy = false;
                var list = entry && entry.status === 'ok' ? entry.variants : [];
                var v = this.variantFor(entry, s.variantId || (list.length === 1 ? list[0].id : ''));
                if (!v || !this.addVariant(s.handle, v, 0)) { this.renderSlot(s); this.openAt(s.handle, trigger); return; }
                s.variantId = v.id;
                this.renderCount();
            });
        }

        renderSlot(s) {
            var st = this.strings, box = s.box;
            var f = document.activeElement;
            var refocus = f && box.contains(f) ? f.getAttribute('data-act') : null;
            box.textContent = '';
            if (!s.variantId) {
                var only = [];
                this.selection.forEach(function (line, id) { if (line.handle === s.handle) only.push(id); });
                if (only.length === 1) s.variantId = only[0];
            }
            Array.prototype.forEach.call(s.el.querySelectorAll('[data-r3d-variant]'), function (img) {
                img.classList.toggle('is-on', numericId(img.getAttribute('data-r3d-variant')) === s.variantId);
            });
            var btn = (cls, act, label, text) => {
                var b = el('button', cls, text);
                b.type = 'button';
                b.setAttribute('data-act', act);
                if (label) b.setAttribute('aria-label', label);
                box.appendChild(b);
                return b;
            };
            var line = s.variantId ? this.selection.get(s.variantId) : null;
            if (s.busy) {
                btn('r3d-slot-btn', 'busy', '', st.loading).disabled = true;
            } else if (line) {
                btn('r3d-slot-step', 'dec', st.decreaseQuantity, '\u2212');
                var input = el('input', 'r3d-slot-qty');
                input.type = 'text';
                input.inputMode = 'numeric';
                input.value = String(line.quantity);
                input.setAttribute('data-act', 'qty');
                input.setAttribute('aria-label', st.quantity + ' \u2014 ' + (line.variantTitle || line.productTitle));
                input.addEventListener('change', () => {
                    var parsed = this.parseQuantity(input.value);
                    if (parsed.ok) this.slotSet(s, parsed.quantity, input); else this.renderSlot(s);
                });
                input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
                box.appendChild(input);
                btn('r3d-slot-step', 'inc', st.increaseQuantity, '+');
            } else {
                var units = 0;
                this.selection.forEach(function (l) { if (l.handle === s.handle) units += l.quantity; });
                if (units && !s.variantId) btn('r3d-slot-btn', 'open', '', fmt(st.inOrder, { n: units }));
                else btn('r3d-slot-btn', 'add', '', st.addToOrder);
            }
            var again = refocus && box.querySelector('[data-act="' + refocus + '"]');
            if (again) again.focus();
        }

        // Hotspot card with its own variant select and stepper: straight
        // into the order; anything unusual opens the pad at the product.
        addFromHotspot(handle, variantId, quantity, trigger) {
            var h = String(handle || '').toLowerCase();
            var id = numericId(variantId);
            if (this.state !== 'editing' || !this.byHandle.has(h) || !/^\d+$/.test(id)) { this.openAt(h, trigger); return; }
            this.ensureVariants(h).then((entry) => {
                var v = this.variantFor(entry, id);
                var q = v ? this.addVariant(h, v, Math.max(1, quantity | 0)) : 0;
                if (!q) { this.openAt(h, trigger); return; }
                this.renderCount();
                this.toast(fmt(this.strings.addedToOrder, { n: q }));
            });
        }

        toast(text) {
            if (this.toastEl) this.toastEl.remove();
            clearTimeout(this.toastTimer);
            var t = el('div', 'r3d-order-toast');
            t.setAttribute('role', 'status');
            t.appendChild(el('span', '', text));
            var b = el('button', 'r3d-order-toast-btn', this.strings.viewOrder);
            b.type = 'button';
            b.addEventListener('click', () => { t.remove(); this.setFilter(true, true); this.open(this.fab); });
            t.appendChild(b);
            document.body.appendChild(t);
            this.toastEl = t;
            this.toastTimer = setTimeout(function () { t.remove(); }, 4000);
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
