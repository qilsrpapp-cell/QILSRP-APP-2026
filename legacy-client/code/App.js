import ApiClient from './util/ApiClient.js';

import AuthController from './controller/AuthController.js';
import UserController from './controller/UserController.js';
import CohortController from './controller/CohortController.js';
import MessageController from './controller/MessageController.js';
import ResourceController from './controller/ResourceController.js';
import FolderController from './controller/FolderController.js';
import EventController from './controller/EventController.js'
import SettingsController from './controller/SettingsController.js';

import RegisterView from './view/RegisterView.js';
import LoginView from './view/LoginView.js';
import NavView from './view/NavView.js';
import HomeView from './view/HomeView.js';
import EventsView from './view/EventsView.js';
import MessagesView from './view/MessagesView.js';
import ResourcesView from './view/ResourcesView.js';
import CohortsView from './view/CohortsView.js';
import UserView from './view/UserView.js';
import SettingsView from './view/SettingsView.js';

const API_URL = 'http://localhost:3000';

/**
 * Top-level application: owns the controllers (data/business logic) and the
 * views (rendering), and acts as a simple router between pages.
 */
export default class App {
  constructor() {
    this.api = new ApiClient(API_URL);

    this.auth = new AuthController(this.api);
    this.users = new UserController(this.api);
    this.cohort = new CohortController(this.api);
    this.messages = new MessageController(this.api);
    this.settings = new SettingsController(this.api);
    this.resources = new ResourceController(this.api);
    this.folders = new FolderController(this.api);
    this.event = new EventController(this.api)

    this.loginScreen = document.getElementById('login-screen');
    this.registerScreen = document.getElementById('register-screen');
    this.appScreen = document.getElementById('app');
    this.headerUser = document.getElementById('header-user');
    this.navEl = document.getElementById('nav');
    this.pageEl = document.getElementById('page');

    this.loginView = new LoginView(this.loginScreen, this);
    this.registerView = new RegisterView(this.registerScreen, this),
    this.navView = new NavView(this.navEl, this);

    this.pages = {
      home: new HomeView(this.pageEl, this),
      events: new EventsView(this.pageEl, this),
      messages: new MessagesView(this.pageEl, this),
      resources: new ResourcesView(this.pageEl, this),
      cohorts: new CohortsView(this.pageEl, this),
      user: new UserView(this.pageEl, this),
      settings: new SettingsView(this.pageEl, this),
    };
  }

  init() {
    this.loginView.mount();

    document.addEventListener('keydown', event => {
      if (event.key === 'Enter' && this.loginScreen.style.display !== 'none') {
        this.loginView.submit();
      }
    });

    if (this.auth.isAuthenticated) {
      // Temp handling for paths, added for resource sharing. This handling can be removed if a react router is used for front-end in the future.

      // Get the path the user is trying to access (URL without domain name)
      const path = window.location.pathname;

      // -------------- Resource Route -------------------
      if(path.startsWith('/resource/')) {
        // Gets each element of the path. Will have a blank first element
        const pathSplit = path.split('/');

        // Share route
        if(pathSplit[2] === 'share') {
          const resourceID = Number.parseInt(pathSplit[3]);

          const user = this.auth.currentUser;

          try {
            
            if(this.resources.checkAccess(resourceID, user.role, user.cohort)) 
            {
              {
                try {
                  // Access shared resource, currently just downloads it.
                  this.resources.downloadResource(resourceID);
                }
                catch (e)
                {
                  console.error(e);
                  this.showApp();
                }
              }
            }
            else {
              window.alert('You do not have access to this resource');
              this.showApp()
            }

          }
          catch (e)
          {
            // Raise alert with error and continue to app
            window.alert(e);
            this.showApp();
          }
          
          // Change the URL to /home to avoid re-downloading the resource on refresh.
          // pushState accomplishes this without reloading the page, and user's can use the back feature of their browser to re-attempt download.
          window.history.pushState({}, '', '/home')
        }
      }

      this.showApp();
    }
  }

  showRegister() {
    this.loginScreen.style.display = 'none';
    this.registerScreen.style.display = 'block';
    this.registerView.mount();
  }

  showApp() {
    this.loginScreen.style.display = 'none';
    this.registerScreen.style.display = 'none';
    this.appScreen.style.display = 'block';
    this.headerUser.textContent = `${this.auth.currentUser.name} (${this.auth.currentUser.role})`;
    this.navView.build();
    return this.navigate('home');
  }

  logout() {
    this.auth.logout();
    this.appScreen.style.display = 'none';
    this.loginScreen.style.display = 'block';
    this.loginView.reset();
  }

  async navigate(pageKey) {
    const view = this.pages[pageKey];
    if (!view) return;

    this.navView.setActive(pageKey);

    try {
      await view.mount();
    } catch (error) {
      if (error.status === 401) {
        this.logout();
        alert('Your session has expired. Please log in again.');
      } else {
        console.error(error);
        this.pageEl.innerHTML = '<p>Something went wrong loading this page.</p>';
      }
    }
  }
}
