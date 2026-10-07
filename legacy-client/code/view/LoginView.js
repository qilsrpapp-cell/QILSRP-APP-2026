export default class LoginView {
  constructor(container, app) {
    this.container = container;
    this.app = app;
    this.contactInput = container.querySelector('#login-contact');
    this.passwordInput = container.querySelector('#login-password');
    this.errorEl = container.querySelector('#login-error');
    this.submitBtn = container.querySelector('#login-submit');
    this.registerBtn = container.querySelector('#go-to-register');
  }

  mount() {
    this.submitBtn.addEventListener('click', () => this.submit());
    this.registerBtn.addEventListener('click', () => this.app.showRegister());
  }

  async submit() {
    const contact = this.contactInput.value;
    const password = this.passwordInput.value.trim();
    this.errorEl.style.display = 'none';

    try {
      await this.app.auth.login(contact, password);
      await this.app.showApp();
    } catch (error) {
      this.errorEl.textContent = error.message || 'Invalid email/mobile or password.';
      this.errorEl.style.display = 'block';
    }
  }

  reset() {
    this.contactInput.value = '';
    this.passwordInput.value = '';
    this.errorEl.style.display = 'none';
  }
}
