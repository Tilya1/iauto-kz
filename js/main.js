/* =========================================================
   iAuto.kz — логика сайта
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.IAUTO_CONFIG || {};
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- данные кейсов ---------- */
  var CASES = {
    'camry-hub': {
      tag: 'Ходовая часть',
      title: 'Toyota Camry 70 — подбор ступицы KOYO 43550-33010',
      img: 'assets/img/work-hub.jpg',
      story: 'Машина стояла на СТО, клиенту срочно нужна была передняя ступица. На СТО предложили деталь за 185 000 ₸ и ожидание несколько дней.',
      steps: [
        'Проверили VIN и комплектацию — определили оригинальный номер 43550-33010',
        'Нашли ступицу KOYO (поставщик конвейера Toyota) в наличии в Алматы',
        'Доставили на СТО в тот же день, машина ушла к клиенту вечером'
      ],
      was: '185 000 ₸', price: '142 000 ₸', saving: '43 000 ₸'
    },
    'elantra-generator': {
      tag: 'Электрооборудование',
      title: 'Hyundai Elantra — подбор генератора Valeo 37300-2E900',
      img: 'assets/img/work-generator.jpg',
      story: 'Магазин не мог найти генератор Valeo 37300-2E900 под запрос своего клиента. На маркетплейсе цена начиналась от 145 000 ₸.',
      steps: [
        'Подобрали по VIN, подтвердили совместимость по OEM-каталогу',
        'Нашли оригинальный генератор с гарантией 2 года',
        'Передали магазину готовый вариант — клиент магазина получил деталь на следующий день'
      ],
      was: '145 000 ₸', price: '112 000 ₸', saving: '33 000 ₸'
    },
    'lexus-headlight': {
      tag: 'Оптика',
      title: 'Lexus RX350 — подбор фары Triple Beam LED',
      img: 'assets/img/work-headlight.jpg',
      story: 'После ДТП клиенту нужна была левая фара Triple Beam LED. Дилер предлагал варианты от 340 000 ₸ со сроком поставки 3 недели.',
      steps: [
        'Проверили VIN, уточнили тип оптики и год рестайлинга',
        'Нашли OEM-фару без дефектов, проверили маркировку и крепления',
        'Помогли закрыть вопрос за 255 000 ₸ с доставкой в сервис'
      ],
      was: '340 000 ₸', price: '255 000 ₸', saving: '85 000 ₸'
    },
    'bmw-cv': {
      tag: 'Трансмиссия',
      title: 'BMW G30 — подбор наружного ШРУСа GSP 601055',
      img: 'assets/img/work-cv-joint.jpg',
      story: 'После износа наружный ШРУС начал хрустеть при поворотах, появилась вибрация при разгоне. В магазинах цены начинались от 128 000 ₸.',
      steps: [
        'Проверили VIN — определили тип привода и количество шлицов',
        'Подобрали ШРУС GSP 601055 с полной совместимостью и гарантией',
        'Доставили в СТО клиента в день обращения'
      ],
      was: '128 000 ₸', price: '89 000 ₸', saving: '39 000 ₸'
    }
  };

  /* ---------- утилиты ---------- */
  function toast(msg, isError) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-error', !!isError);
    el.classList.add('is-visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('is-visible'); }, 3500);
  }

  function digits(str) { return (str || '').replace(/\D/g, ''); }

  function formatPhone(value) {
    var d = digits(value);
    if (d.length && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    d = d.slice(0, 10);
    var out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ')';
    if (d.length > 3) out += ' ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }

  function waLink(text) {
    return 'https://wa.me/' + (CFG.whatsapp || '') + (text ? '?text=' + encodeURIComponent(text) : '');
  }
  function tgLink() { return 'https://t.me/' + (CFG.telegram || ''); }

  /* ---------- контакты из конфига ---------- */
  function applyContacts() {
    $$('[data-messenger]').forEach(function (a) {
      var kind = a.getAttribute('data-messenger');
      a.href = kind === 'whatsapp' ? waLink(CFG.messengerText) : tgLink();
      a.target = '_blank';
      a.rel = 'noopener';
    });
    $$('[data-contact]').forEach(function (el) {
      var kind = el.getAttribute('data-contact');
      switch (kind) {
        case 'phone': el.textContent = CFG.phone || el.textContent; if (el.tagName === 'A') el.href = 'tel:' + (CFG.phoneRaw || digits(CFG.phone)); break;
        case 'email': el.textContent = CFG.email || el.textContent; if (el.tagName === 'A') el.href = 'mailto:' + CFG.email; break;
        case 'address': el.textContent = CFG.address || el.textContent; break;
        case 'map': if (el.tagName === 'A') el.href = CFG.mapUrl || '#'; break;
        case 'instagram': if (el.tagName === 'A') el.href = 'https://instagram.com/' + (CFG.instagram || ''); break;
      }
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- шапка ---------- */
  function initHeader() {
    var header = $('#header');
    var burger = $('#burger');
    var nav = $('#nav');
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 10); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    function closeNav() {
      nav.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
    }
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-locked', open);
    });
    $$('.nav__link', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
    window.addEventListener('resize', function () { if (window.innerWidth > 899) closeNav(); });

    // подсветка активного пункта меню
    var links = $$('.nav__link');
    var sections = links.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------- плавный скролл с учётом шапки ---------- */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      var offset = ($('#header') ? $('#header').offsetHeight : 0) + 8;
      var top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      history.replaceState(null, '', id);
    });
  }

  /* ---------- аккордеоны ---------- */
  function initAccordions() {
    $$('[data-accordion]').forEach(function (acc) {
      var single = acc.hasAttribute('data-accordion-single');
      var items = $$('.acc-item, .faq-item', acc);
      items.forEach(function (item) {
        var head = $('.acc-item__head, .faq-item__head', item);
        if (!head) return;
        head.addEventListener('click', function () {
          var willOpen = !item.classList.contains('is-open');
          if (single) {
            items.forEach(function (i) {
              i.classList.remove('is-open');
              var h = $('.acc-item__head, .faq-item__head', i);
              if (h) h.setAttribute('aria-expanded', 'false');
            });
          }
          item.classList.toggle('is-open', willOpen);
          head.setAttribute('aria-expanded', String(willOpen));
        });
      });
    });
  }

  /* ---------- появление блоков ---------- */
  function initReveal() {
    var els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- модальные окна ---------- */
  var lastFocus = null;
  function openModal(id) {
    var m = typeof id === 'string' ? $(id) : id;
    if (!m) return;
    lastFocus = document.activeElement;
    $$('.modal.is-open').forEach(function (o) { o.classList.remove('is-open'); o.setAttribute('aria-hidden', 'true'); });
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    var first = $('input:not([type=hidden]), button.btn, .modal__close', m);
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeModal(m) {
    m = m || $('.modal.is-open');
    if (!m) return;
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('.modal.is-open')) document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function initModals() {
    document.addEventListener('click', function (e) {
      var closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) { closeModal(closeBtn.closest('.modal')); return; }

      var trigger = e.target.closest('[data-modal="lead"]');
      if (trigger) {
        e.preventDefault();
        var modal = $('#modal-lead');
        var form = $('#modal-form');
        var type = trigger.getAttribute('data-type') || 'client';
        $('#modal-lead-title').textContent = trigger.getAttribute('data-title') || 'Подать заявку';
        $('.modal__subtitle', modal).textContent = trigger.getAttribute('data-subtitle') || '';
        form.type.value = type;
        form.source.value = trigger.getAttribute('data-title') || 'Модальное окно';
        var isSeller = type === 'seller';
        $('[data-field="company"]', form).hidden = !isSeller;
        $('[data-field="car"]', form).hidden = isSeller;
        $('[data-field="vin"]', form).hidden = isSeller;
        $('textarea', form).placeholder = isSeller ? 'Какие запчасти продаёте, где находитесь' : 'Что произошло -  короткое описание';
        clearForm(form);
        openModal(modal);
        return;
      }

      var caseBtn = e.target.closest('[data-case-open]');
      if (caseBtn) { openCase(caseBtn.getAttribute('data-case-open')); return; }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  function openCase(key) {
    var c = CASES[key];
    if (!c) return;
    $('#case-img').src = c.img;
    $('#case-img').alt = c.title;
    $('#case-tag').textContent = c.tag;
    $('#modal-case-title').textContent = c.title;
    $('#case-story').textContent = c.story;
    var ul = $('#case-steps');
    ul.innerHTML = '';
    c.steps.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
    $('#case-was').textContent = c.was;
    $('#case-price').textContent = c.price;
    $('#case-saving').textContent = c.saving;
    var cta = $('#case-cta');
    cta.setAttribute('data-modal', 'lead');
    cta.setAttribute('data-title', 'Подобрать деталь');
    cta.setAttribute('data-subtitle', 'Кейс: ' + c.title + '. Укажите ваше авто — подберём аналогичный вариант.');
    openModal('#modal-case');
  }

  /* ---------- формы ---------- */
  function clearForm(form) {
    $$('.field, .checkbox', form).forEach(function (f) { f.classList.remove('is-error'); });
    var st = $('.form__status', form);
    if (st) { st.textContent = ''; st.className = 'form__status'; }
  }

  function setError(input, msg) {
    var wrap = input.closest('.field, .checkbox');
    if (!wrap) return;
    wrap.classList.add('is-error');
    if (wrap.classList.contains('field')) {
      var err = $('.field__error', wrap);
      if (!err) { err = document.createElement('span'); err.className = 'field__error'; wrap.appendChild(err); }
      err.textContent = msg;
    }
  }

  function validate(form) {
    clearForm(form);
    var ok = true;
    var name = form.name;
    var phone = form.phone;
    var consent = form.consent;
    if (!name.value.trim() || name.value.trim().length < 2) { setError(name, 'Укажите имя'); ok = false; }
    if (digits(phone.value).length !== 11) { setError(phone, 'Введите номер полностью'); ok = false; }
    if (form.car && !form.car.closest('[hidden]') && form.car.hasAttribute('required') && !form.car.value.trim()) { setError(form.car, 'Укажите марку и модель'); ok = false; }
    if (form.vin && form.vin.value && form.vin.value.length < 17) { setError(form.vin, 'VIN состоит из 17 символов'); ok = false; }
    if (consent && !consent.checked) { consent.closest('.checkbox').classList.add('is-error'); ok = false; }
    return ok;
  }

  function collect(form) {
    var data = {};
    $$('input, textarea', form).forEach(function (el) {
      if (!el.name || el.closest('[hidden]')) return;
      if (el.type === 'checkbox') data[el.name] = el.checked; else data[el.name] = el.value.trim();
    });
    data.page = location.href;
    data.userAgent = navigator.userAgent;
    return data;
  }

  function buildWaText(data) {
    var lines = ['Заявка с сайта iAuto.kz (' + (data.source || 'форма') + ')'];
    lines.push('Имя: ' + data.name);
    lines.push('Телефон: ' + data.phone);
    if (data.company) lines.push('Магазин: ' + data.company);
    if (data.car) lines.push('Авто: ' + data.car);
    if (data.vin) lines.push('VIN: ' + data.vin);
    if (data.message) lines.push('Описание: ' + data.message);
    return lines.join('\n');
  }

  function sendLead(data) {
    if (!window.fetch || location.protocol === 'file:') return Promise.reject(new Error('no-api'));
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    return fetch(CFG.apiUrl || '/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http-' + r.status);
      return r.json().catch(function () { return {}; });
    });
  }

  function initForms() {
    $$('[data-phone]').forEach(function (input) {
      input.addEventListener('focus', function () { if (!input.value) input.value = '+7 ('; });
      input.addEventListener('blur', function () { if (digits(input.value).length <= 1) input.value = ''; });
      input.addEventListener('input', function () { input.value = formatPhone(input.value); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && digits(input.value).length <= 1) { e.preventDefault(); input.value = ''; }
      });
    });
    $$('[data-vin]').forEach(function (input) {
      input.addEventListener('input', function () {
        input.value = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
      });
    });

    $$('form[data-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) { toast('Проверьте заполнение формы', true); return; }
        var btn = $('button[type=submit]', form);
        var status = $('.form__status', form);
        var data = collect(form);
        btn.disabled = true;
        var label = btn.textContent;
        btn.textContent = 'Отправляем…';
        status.textContent = '';

        sendLead(data).then(function () {
          form.reset();
          clearForm(form);
          closeModal();
          openModal('#modal-success');
        }).catch(function () {
          // Сервер недоступен — открываем WhatsApp с готовой заявкой
          var url = waLink(buildWaText(data));
          var win = window.open(url, '_blank', 'noopener');
          status.className = 'form__status is-ok';
          status.textContent = 'Заявка сформирована — отправьте её в открывшемся WhatsApp.';
          if (!win) {
            status.className = 'form__status is-error';
            status.innerHTML = 'Не удалось отправить автоматически. <a href="' + url + '" target="_blank" rel="noopener">Отправить через WhatsApp</a>';
          }
          form.reset();
        }).then(function () {
          btn.disabled = false;
          btn.textContent = label;
        });
      });
      $$('.input', form).forEach(function (input) {
        input.addEventListener('input', function () {
          var wrap = input.closest('.field');
          if (wrap) wrap.classList.remove('is-error');
        });
      });
      var consent = form.consent;
      if (consent) consent.addEventListener('change', function () { consent.closest('.checkbox').classList.remove('is-error'); });
    });
  }

  /* ---------- запуск ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    applyContacts();
    initHeader();
    initSmoothScroll();
    initAccordions();
    initReveal();
    initModals();
    initForms();
  });
})();
