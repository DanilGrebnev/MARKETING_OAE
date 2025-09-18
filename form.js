(function () {
    const form = document.getElementById("consultation-form");
    if (!form) {
        return;
    }

    const config = {
        enableFormspree: form.dataset.formspree === "true",
        formspreeEndpoint: form.dataset.formspreeEndpoint || "",
        fallbackEmail: "hello@trendinsightlab.com"
    };

    const status = document.createElement("p");
    status.className = "form__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.appendChild(status);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        resetStatus();

        const formData = new FormData(form);
        const validation = validateForm(formData);

        if (!validation.valid) {
            showStatus(validation.message, "error");
            return;
        }

        if (config.enableFormspree && config.formspreeEndpoint) {
            try {
                const response = await sendToFormspree(formData);
                if (response.ok) {
                    form.reset();
                    showStatus("Спасибо! Запрос отправлен и мы скоро свяжемся с вами.", "success");
                    return;
                }
            } catch (error) {
                console.warn("Formspree request failed, fallback to mailto.", error);
            }
        }

        openMailFallback(formData);
    });

    function validateForm(formData) {
        const requiredFields = ["company", "website", "industry", "contact_person", "email", "consent"];
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                return { valid: false, message: "Пожалуйста, заполните все обязательные поля." };
            }
        }

        const email = formData.get("email");
        if (!validateEmail(email)) {
            return { valid: false, message: "Проверьте корректность email адреса." };
        }

        return { valid: true };
    }

    function validateEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(String(email).toLowerCase());
    }

    async function sendToFormspree(formData) {
        return fetch(config.formspreeEndpoint, {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            body: formData
        });
    }

    function openMailFallback(formData) {
        const subject = `Запрос на исследование от ${formData.get("company") || "компании"}`;
        const lines = [
            "Новый запрос на исследование:",
            `Название компании: ${formData.get("company") || ""}`,
            `Веб-сайт: ${formData.get("website") || ""}`,
            `Отрасль: ${formData.get("industry") || ""}`,
            `Контактное лицо: ${formData.get("contact_person") || ""}`,
            `Email: ${formData.get("email") || ""}`,
            "",
            "Комментарий:",
            formData.get("message") || "Без комментариев"
        ];
        const body = lines.join("\n");
        window.location.href = `mailto:${config.fallbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        showStatus("Открылось письмо в почтовом клиенте. Если этого не произошло, напишите на hello@trendinsightlab.com.", "success");
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.classList.remove("form__status--error", "form__status--success");
        if (type === "error") {
            status.classList.add("form__status--error");
        }
        if (type === "success") {
            status.classList.add("form__status--success");
        }
    }

    function resetStatus() {
        status.textContent = "";
        status.classList.remove("form__status--error", "form__status--success");
    }
})();
