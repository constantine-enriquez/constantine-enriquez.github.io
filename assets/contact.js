(() => {
    const form = document.querySelector('.contact-form');
    if (!form) return;

    const errorBox = form.querySelector('.form-error');
    const submitBtn = form.querySelector('.form-submit');
    const dialog = document.getElementById('success-dialog');
    const projectSelect = form.querySelector('select[name="project_type"]');

    /* Rate limiting */
    let lastSubmissionTime = 0;
    const RATE_LIMIT_MS = 30000; // 30 seconds between submissions

    function validateForm() {
        const name = form.querySelector('input[name="name"]').value.trim();
        const email = form.querySelector('input[name="email"]').value.trim();
        const message = form.querySelector('textarea[name="message"]').value.trim();
        const honeypot = form.querySelector('input[name="_gotcha"]').value;

        if (honeypot) return { valid: false, error: 'Spam detected' };

        const now = Date.now();
        if (now - lastSubmissionTime < RATE_LIMIT_MS) {
            const remaining = Math.ceil((RATE_LIMIT_MS - (now - lastSubmissionTime)) / 1000);
            return { valid: false, error: `Please wait ${remaining} seconds before submitting again.` };
        }

        if (name.length < 2) return { valid: false, error: 'Please enter a valid name.', field: 'name' };
        if (!email.includes('@') || email.length < 5) return { valid: false, error: 'Please enter a valid email address.', field: 'email' };
        if (message.length < 10) return { valid: false, error: 'Please provide more details about your project (at least 10 characters).', field: 'message' };

        const suspiciousPatterns = [
            /\b(viagra|casino|lottery|winner|congratulations)\b/i,
            /\b(click here|limited time|act now|urgent)\b/i,
            /(https?:\/\/[^\s]+){3,}/, // Multiple URLs
            /(.)\1{10,}/               // Repeated characters
        ];
        const fullText = `${name} ${email} ${message}`.toLowerCase();
        if (suspiciousPatterns.some((p) => p.test(fullText))) {
            return { valid: false, error: 'Message appears to be spam. Please contact me directly if this is a legitimate inquiry.' };
        }

        return { valid: true };
    }

    let errorTimer;
    function showError(message, fieldName) {
        clearTimeout(errorTimer);
        errorBox.innerHTML = '<i class="fas fa-exclamation-triangle" aria-hidden="true"></i><span></span>';
        errorBox.querySelector('span').textContent = message;
        errorBox.hidden = false;
        errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (fieldName) {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (field) field.focus({ preventScroll: true });
        }
        errorTimer = setTimeout(() => { errorBox.hidden = true; }, 6000);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.hidden = true;

        const validation = validateForm();
        if (!validation.valid) {
            showError(validation.error, validation.field);
            return;
        }

        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Sending…';
        submitBtn.disabled = true;

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Form submission failed');
            }

            lastSubmissionTime = Date.now();
            form.reset();
            if (dialog && typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                alert("Message sent! I'll get back to you within 24 hours.");
            }
        } catch (err) {
            console.error('Form submission error:', err);
            showError('Sorry, there was an error sending your message. Please try again or email me directly at constantine-business@outlook.com');
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    });

    /* Close the dialog by tapping the backdrop */
    if (dialog) {
        dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    }

    /* Service cards preselect the project type and jump to the form */
    document.querySelectorAll('.project-type[data-project]').forEach((card) => {
        card.addEventListener('click', () => {
            if (projectSelect) projectSelect.value = card.dataset.project;
            document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
})();
