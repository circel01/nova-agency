/* NOVA — site behaviour: language switch, menu, scroll effects, contact form. No dependencies. */
(function () {
  'use strict';

  var root = document.documentElement;
  var CFG = window.NOVA_CONFIG || {};
  var EN = window.NOVA_EN || {};
  var AR = Object.assign({}, window.NOVA_AR_EXTRA || {});
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- storage (safe) ---------- */
  function store(k, v) { try { if (v === undefined) { return localStorage.getItem(k); } localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- i18n ---------- */
  // Capture the Arabic text that is written in the HTML (single source for Arabic).
  var metaDesc = $('meta[name="description"]');
  AR.meta_title = document.title;
  AR.meta_desc = metaDesc ? metaDesc.getAttribute('content') : '';
  $$('[data-i18n]').forEach(function (el) {
    var k = el.getAttribute('data-i18n');
    if (!(k in AR)) { AR[k] = el.textContent; }
  });
  $$('[data-i18n-attr]').forEach(function (el) {
    el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
      var p = pair.split(':'), attr = p[0].trim(), k = p[1].trim();
      if (!(k in AR)) { AR[k] = el.getAttribute(attr); }
    });
  });

  var lang = root.lang === 'en' ? 'en' : 'ar';
  function t(key, vars) {
    var s = (lang === 'en' ? EN[key] : AR[key]);
    if (s === undefined) { s = AR[key] || key; }
    if (vars) { Object.keys(vars).forEach(function (n) { s = s.replace('{' + n + '}', vars[n]); }); }
    return s;
  }

  var langBtn = $('#langBtn');

  function applyLang(next, persist) {
    lang = next === 'en' ? 'en' : 'ar';
    root.lang = lang;
    root.dir = lang === 'en' ? 'ltr' : 'rtl';

    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    $$('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    document.title = t('meta_title');
    if (metaDesc) { metaDesc.setAttribute('content', t('meta_desc')); }

    if (langBtn) {
      langBtn.textContent = lang === 'en' ? 'عربي' : 'EN';
      langBtn.setAttribute('aria-label', t('lang_aria'));
    }
    renderChannels();
    updateNote();
    if (persist) { store('nova-lang', lang); }
    root.classList.remove('pending-lang');
  }

  if (langBtn) {
    langBtn.addEventListener('click', function () { applyLang(lang === 'en' ? 'ar' : 'en', true); });
  }

  /* ---------- header: scrolled state ---------- */
  var hdr = $('.hdr');
  var ticking = false;
  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    requestAnimationFrame(function () {
      if (hdr) { hdr.classList.toggle('scrolled', window.scrollY > 8); }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = $('#burger'), nav = $('#nav');
  function setMenu(open) {
    if (!burger || !nav) { return; }
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger) { burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); }); }
  if (nav) { nav.addEventListener('click', function (e) { if (e.target.closest('a')) { setMenu(false); } }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 900) { setMenu(false); } });

  /* ---------- scroll reveal ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var el = en.target;
        el.classList.add('in');
        ro.unobserve(el);
        // once shown, drop the reveal styles so hover transitions stay snappy
        setTimeout(function () { el.classList.remove('reveal'); }, 1800);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- active nav link ---------- */
  if ('IntersectionObserver' in window && nav) {
    var links = {};
    $$('a[href^="#"]', nav).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id];
        if (a && en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          a.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) { so.observe(s); } });
  }

  /* ---------- contact ---------- */
  var wa = String(CFG.whatsapp || '').replace(/\D/g, '');
  var mail = String(CFG.email || '').trim();
  var ig = String(CFG.instagram || '').trim();
  var igUrl = ig ? (/^https?:\/\//i.test(ig) ? ig : 'https://instagram.com/' + ig.replace(/^@/, '')) : '';
  var igLabel = ig ? (/^https?:\/\//i.test(ig) ? ig.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '') : '@' + ig.replace(/^@/, '')) : '';

  var channelsEl = $('#channels'), pendingEl = $('#contactPending'), formEl = $('#contactForm'), noteEl = $('#formNote');
  var canSend = !!(wa || mail);

  function renderChannels() {
    if (!channelsEl) { return; }
    var items = [];
    if (wa) { items.push({ l: t('ch_wa'), v: '+' + wa, h: 'https://wa.me/' + wa }); }
    if (mail) { items.push({ l: t('ch_mail'), v: mail, h: 'mailto:' + mail }); }
    if (igUrl) { items.push({ l: t('ch_ig'), v: igLabel, h: igUrl }); }
    channelsEl.textContent = '';
    items.forEach(function (it) {
      var li = document.createElement('li'), a = document.createElement('a'), l = document.createElement('span'), v = document.createElement('span');
      a.href = it.h;
      if (/^https?:/.test(it.h)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      l.className = 'ch-l'; l.textContent = it.l;
      v.className = 'ch-v'; v.textContent = it.v;
      a.appendChild(l); a.appendChild(v); li.appendChild(a); channelsEl.appendChild(li);
    });
    channelsEl.hidden = items.length === 0;
  }

  function updateNote() {
    if (noteEl && canSend && !noteEl.dataset.error) { noteEl.textContent = wa ? t('note_wa') : t('note_mail'); }
  }

  if (formEl && canSend) {
    formEl.hidden = false;
    if (pendingEl) { pendingEl.hidden = true; }
  }

  // Service buttons pre-select the matching option in the form.
  $$('[data-service]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = $('#f-service');
      if (sel) { sel.value = a.getAttribute('data-service'); }
    });
  });

  if (formEl) {
    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#f-name'), msg = $('#f-msg'), sel = $('#f-service');
      var bad = false;
      [name, msg].forEach(function (f) {
        var empty = !f.value.trim();
        f.classList.toggle('invalid', empty);
        f.setAttribute('aria-invalid', empty ? 'true' : 'false');
        if (empty) { bad = true; }
      });
      if (bad) {
        noteEl.dataset.error = '1';
        noteEl.textContent = t('note_fill');
        (name.value.trim() ? msg : name).focus();
        return;
      }
      delete noteEl.dataset.error;
      updateNote();

      var serviceText = sel.options[sel.selectedIndex].textContent;
      var body = t('msg_hello', { name: name.value.trim() }) + '\n' +
                 t('msg_service', { service: serviceText }) + '\n\n' + msg.value.trim();
      if (wa) {
        window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(body), '_blank', 'noopener');
      } else if (mail) {
        window.location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(t('mail_subject')) + '&body=' + encodeURIComponent(body);
      }
    });
    formEl.addEventListener('input', function (e) {
      if (e.target.classList.contains('invalid') && e.target.value.trim()) {
        e.target.classList.remove('invalid'); e.target.setAttribute('aria-invalid', 'false');
      }
    });
  }

  /* ---------- init ---------- */
  applyLang(lang, false);
})();
