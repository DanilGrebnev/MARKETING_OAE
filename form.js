const form = document.querySelector('#contactForm');
const formStatus = document.querySelector('#formStatus');
const submitButton = form?.querySelector('[data-role="submit"]');
const mailtoButton = form?.querySelector('[data-role="mailto"]');
const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function updateStatus(type, message) {
  if (!formStatus) return;
  formStatus.classList.remove('form-status--success', 'form-status--error');
  if (type) {
    formStatus.classList.add(type === 'success' ? 'form-status--success' : 'form-status--error');
  }
  formStatus.textContent = message;
}

function toggleLoading(isLoading) {
  if (!submitButton || !mailtoButton) return;
  submitButton.disabled = isLoading;
  mailtoButton.disabled = isLoading;
  submitButton.classList.toggle('btn--loading', isLoading);
}

function getFieldValue(name) {
  const field = form?.elements.namedItem(name);
  if (field && 'value' in field) {
    return field.value.trim();
  }
  return '';
}

function setFieldValidity(field, isValid) {
  if (!field) return;
  if (isValid) {
    field.removeAttribute('aria-invalid');
  } else {
    field.setAttribute('aria-invalid', 'true');
  }
}

function validateForm() {
  if (!form) return false;
  let isValid = true;
  updateStatus('', '');

  const companyField = form.elements.namedItem('company');
  const contactField = form.elements.namedItem('contactPerson');
  const emailField = form.elements.namedItem('email');
  const consentField = form.elements.namedItem('consent');
  const honeyField = form.elements.namedItem('_honey');

  if (honeyField && 'value' in honeyField && honeyField.value.trim()) {
    updateStatus('error', 'Похоже, запрос заблокирован. Попробуйте ещё раз.');
    return false;
  }

  const requiredFields = [companyField, contactField, emailField, consentField];
  requiredFields.forEach((field) => {
    if (!field) return;
    const value = 'value' in field ? field.value.trim() : field.checked;
    const valid = field instanceof HTMLInputElement && field.type === 'checkbox' ? field.checked : Boolean(value);
    if (!valid) {
      isValid = false;
      setFieldValidity(field, false);
    } else {
      setFieldValidity(field, true);
    }
  });

  if (emailField && 'value' in emailField) {
    const isEmailValid = emailPattern.test(emailField.value.trim());
    if (!isEmailValid) {
      isValid = false;
      setFieldValidity(emailField, false);
      updateStatus('error', 'Введите корректный email.');
    }
  }

  if (!isValid && !formStatus.textContent) {
    updateStatus('error', 'Заполните обязательные поля, чтобы отправить форму.');
  }

  return isValid;
}

function formatMailBody(data) {
  const lines = [
    `Название компании: ${data.company || '—'}`,
    `Веб-сайт: ${data.website || '—'}`,
    `Отрасль: ${data.industry || '—'}`,
    `Контактное лицо: ${data.contactPerson || '—'}`,
    `Email: ${data.email || '—'}`,
    `Комментарий: ${data.comment || '—'}`,
    `Согласие на обработку: ${data.consent ? 'Да' : 'Нет'}`
  ];
  return lines.join('\n');
}

function buildMailtoUrl(data) {
  const subject = encodeURIComponent(`Запрос на маркетинговые исследования — ${data.company || 'не указано'}`);
  const body = encodeURIComponent(formatMailBody(data));
  return `mailto:hello@neonlab.team?subject=${subject}&body=${body}`;
}

async function submitForm(event) {
  event.preventDefault();
  if (!form || !submitButton) return;

  if (!validateForm()) {
    return;
  }

  const payload = {
    company: getFieldValue('company'),
    website: getFieldValue('website'),
    industry: getFieldValue('industry'),
    contactPerson: getFieldValue('contactPerson'),
    email: getFieldValue('email'),
    comment: getFieldValue('comment'),
    consent: form.elements.namedItem('consent') instanceof HTMLInputElement ? form.elements.namedItem('consent').checked : false,
    source: 'Neon Insight Lab landing'
  };

  toggleLoading(true);
  updateStatus('', '');

  const endpoint = form.getAttribute('action') || 'https://formspree.io/f/YOUR_ID';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Formspree responded with ${response.status}`);
    }

    updateStatus('success', 'Спасибо! Мы получили ваш запрос и ответим в течение рабочего дня.');
    form.reset();
  } catch (error) {
    const mailtoUrl = buildMailtoUrl(payload);
    window.location.href = mailtoUrl;
    updateStatus('error', 'Онлайн-отправка не удалась. Мы открыли письмо — проверьте его и отправьте вручную.');
    console.warn('Form submission failed, used mailto fallback.', error);
  } finally {
    toggleLoading(false);
  }
}

function handleMailtoClick() {
  if (!form) return;
  const payload = {
    company: getFieldValue('company'),
    website: getFieldValue('website'),
    industry: getFieldValue('industry'),
    contactPerson: getFieldValue('contactPerson'),
    email: getFieldValue('email'),
    comment: getFieldValue('comment'),
    consent: form.elements.namedItem('consent') instanceof HTMLInputElement ? form.elements.namedItem('consent').checked : false
  };
  const mailtoUrl = buildMailtoUrl(payload);
  window.location.href = mailtoUrl;
  updateStatus('success', 'Подготовили письмо — проверьте и отправьте его, чтобы связаться с нами.');
}

function bindFieldListeners() {
  if (!form) return;
  form.addEventListener('input', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.hasAttribute('aria-invalid') && target.value.trim()) {
        setFieldValidity(target, true);
        if (formStatus?.classList.contains('form-status--error')) {
          updateStatus('', '');
        }
      }
    }
  });
}

function initNavigation() {
  if (!navToggle || !mainNav) return;
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', (!expanded).toString());
    mainNav.classList.toggle('is-open', !expanded);
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        navToggle.setAttribute('aria-expanded', 'false');
        mainNav.classList.remove('is-open');
      }
    });
  });
}

async function initOptionalGlobe() {
  const visual = document.querySelector('.hero__visual');
  if (!visual) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isMobile = window.matchMedia('(max-width: 600px)');

  if (prefersReducedMotion.matches || isMobile.matches) {
    return;
  }

  try {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.min.js');
    const { clientWidth, clientHeight } = visual;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(clientWidth, clientHeight);
    renderer.domElement.classList.add('hero__canvas');
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.pointerEvents = 'none';
    visual.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, clientWidth / clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3.6);

    const pointsCount = 1600;
    const positions = new Float32Array(pointsCount * 3);
    const colors = new Float32Array(pointsCount * 3);

    const cyan = new THREE.Color('#00e6ff');
    const magenta = new THREE.Color('#b64cff');

    for (let i = 0; i < pointsCount; i += 1) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const radius = 1.2 + (Math.random() - 0.5) * 0.08;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const idx = i * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      const color = i % 2 === 0 ? cyan : magenta;
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let animationFrameId = 0;

    const render = () => {
      points.rotation.y += 0.0025;
      points.rotation.x += 0.0009;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      const { clientWidth: width, clientHeight: height } = visual;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const stopAnimation = () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };

    const handleMotionQuery = (event) => {
      if (event.matches) {
        stopAnimation();
      }
    };

    if (typeof prefersReducedMotion.addEventListener === 'function') {
      prefersReducedMotion.addEventListener('change', handleMotionQuery);
    } else if (typeof prefersReducedMotion.addListener === 'function') {
      prefersReducedMotion.addListener(handleMotionQuery);
    }

    const handleMobileChange = (event) => {
      if (event.matches) {
        stopAnimation();
      }
    };

    if (typeof isMobile.addEventListener === 'function') {
      isMobile.addEventListener('change', handleMobileChange);
    } else if (typeof isMobile.addListener === 'function') {
      isMobile.addListener(handleMobileChange);
    }
  } catch (error) {
    console.warn('Не удалось инициализировать дополнительную анимацию.', error);
  }
}

if (form) {
  form.addEventListener('submit', submitForm);
  bindFieldListeners();
}

if (mailtoButton) {
  mailtoButton.addEventListener('click', handleMailtoClick);
}

initNavigation();
initOptionalGlobe();