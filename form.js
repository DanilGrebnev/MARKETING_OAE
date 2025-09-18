(function () {
    const form = document.getElementById("contactForm");
    if (!form) {
        return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    const mailButton = form.querySelector("[data-mailto]");
    const statusNode = document.getElementById("formStatus");
    const formspreeEndpoint = form.getAttribute("data-formspree-endpoint") || "https://formspree.io/f/YOUR_ID";
    const fallbackEmail = form.getAttribute("data-fallback-email") || "hello@trendscope.team";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let isSubmitting = false;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const formData = new FormData(form);
        resetStatus();

        if (formData.get("_honey")) {
            return;
        }

        const error = validate(formData);
        if (error) {
            showStatus(error, "error");
            return;
        }

        setLoadingState(true);

        try {
            const response = await fetch(formspreeEndpoint, {
                method: "POST",
                headers: {
                    Accept: "application/json"
                },
                body: formData
            });

            if (response.ok) {
                form.reset();
                showStatus("Спасибо! Мы получили ваш запрос и скоро ответим.", "success");
            } else {
                fallbackToMail(formData, "Не удалось отправить форму. Мы подготовили письмо для отправки вручную.");
            }
        } catch (error) {
            console.warn("Form submission failed, fallback to mailto.", error);
            fallbackToMail(formData, "Сеть недоступна. Мы открыли черновик письма на почте.");
        } finally {
            setLoadingState(false);
        }
    });

    if (mailButton) {
        mailButton.addEventListener("click", function (event) {
            event.preventDefault();
            if (isSubmitting) {
                return;
            }

            const formData = new FormData(form);
            const error = validate(formData);
            if (error) {
                showStatus(error, "error");
                return;
            }

            fallbackToMail(formData, "Мы открыли письмо в почтовом клиенте. Если этого не произошло, напишите на " + fallbackEmail + ".");
        });
    }

    function validate(formData) {
        const company = formData.get("company");
        if (!company || !String(company).trim()) {
            return "Укажите название компании.";
        }

        const contact = formData.get("contact_person");
        if (!contact || !String(contact).trim()) {
            return "Добавьте контактное лицо.";
        }

        const email = formData.get("email");
        if (!email || !String(email).trim()) {
            return "Заполните email.";
        }

        if (!emailPattern.test(String(email).toLowerCase())) {
            return "Проверьте корректность email.";
        }

        const consentField = form.querySelector("input[name='consent']");
        if (consentField && !consentField.checked) {
            return "Для отправки требуется согласие на обработку данных.";
        }

        return "";
    }

    function fallbackToMail(formData, message) {
        const mailto = buildMailto(formData);
        window.location.href = mailto;
        if (message) {
            showStatus(message, "info");
        }
    }

    function buildMailto(formData) {
        const subject = `Запрос на исследование — ${formData.get("company") || "компания"}`;
        const lines = [
            "Новый запрос на маркетинговое исследование:",
            `Компания: ${formData.get("company") || ""}`,
            `Веб-сайт: ${formData.get("website") || ""}`,
            `Отрасль: ${formData.get("industry") || ""}`,
            `Контактное лицо: ${formData.get("contact_person") || ""}`,
            `Email: ${formData.get("email") || ""}`,
            "",
            "Комментарий:",
            formData.get("comment") || "Без комментариев"
        ];
        const body = encodeURIComponent(lines.join("\n"));
        const encodedSubject = encodeURIComponent(subject);
        return `mailto:${fallbackEmail}?subject=${encodedSubject}&body=${body}`;
    }

    function setLoadingState(active) {
        isSubmitting = active;
        if (submitButton) {
            submitButton.disabled = active;
            submitButton.classList.toggle("button--loading", active);
            submitButton.setAttribute("aria-busy", String(active));
        }
        if (mailButton) {
            mailButton.disabled = active;
            mailButton.setAttribute("aria-disabled", String(active));
        }
    }

    function showStatus(message, type) {
        if (!statusNode) {
            return;
        }
        statusNode.textContent = message;
        statusNode.classList.remove("form-status--success", "form-status--error", "form-status--info");
        if (type) {
            statusNode.classList.add(`form-status--${type}`);
        }
    }

    function resetStatus() {
        if (!statusNode) {
            return;
        }
        statusNode.textContent = "";
        statusNode.classList.remove("form-status--success", "form-status--error", "form-status--info");
    }
})();
