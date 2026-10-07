import { escapeHtml } from '../util/dom.js';

const ROOT_ID = 1; // Assuming 1 is the root folder ID

export default class ResourcesView {
  constructor(container, app) {
    
    this.container = container;
    this.app = app;
    this.currentFolderID = ROOT_ID;
    this.user = this.app.auth.currentUser; // Store the current user for permission checks
  }

  async mount() {
    const canAdd = !this.user.isStudent; // Flag for if the user should be allowed to add resources.

    let current_folder_id = ROOT_ID; // Temp set, later will be parameter for population method

    let html_static = '<h2>Resource Hub</h2>';

    if (canAdd) {
      html_static += `
        <div class="card">
          <h2>Add a resource</h2>
          <br>
          <form id="res-form">
            <label>Title</label><input type="text" id="res-title" name="title" placeholder="Leave blank to use file name"/>
            <label>Type</label>
            <select id="res-type" name="type" required>
              <option value="">Select a type</option>
              <option>Image</option>
              <option>PDF</option>
              <option>Audio</option>
              <option>Video</option>
              <option>Document</option>
              <option>Spreadsheet</option>
              <option>Presentation</option>
            </select>

            <div id="res-input-container">
            </div>

            <label>Minimum Access Level</label>
            <select id="res-access" name="access">
              <option>Student</option>
              <option>Ranger</option>
              <option>Admin</option>
            </select>

            <label>Cohorts that can access</label>
            <select id="res-cohorts" name="cohorts" multiple size="4">
            </select>

            <input type="submit" value="Add Resource"/>
          </form>
        </div>
        </div>
        <br>
      `;
    }

    html_static += `
    <div class="card">
    <div id="folder-contents"></div>
    `;
    
    if (canAdd)
      {
        html_static += `
        <div class="card">
          <h2>Create New Folder</h2>
          <br>
          <form id="folder-form">
            <label>Name</label><input type="text" id="folder-name" name="name" required/>

            <label>Minimum Access Level</label>
            <select id="folder-access" name="access">
              <option>Student</option>
              <option>Ranger</option>
              <option>Admin</option>
            </select>

            <label>Cohorts that can access</label>
            <select id="folder-cohorts" name="cohorts" multiple size="4">
            </select>

            <input type="submit" value="Add Folder"/>
          </form>
        </div>
        `
      }    

    this.container.innerHTML = html_static;

    
    // Update the resource input fields based on the selected type.
    if (canAdd) {
        const resTypeSelect = this.container.querySelector('#res-type');

        resTypeSelect.addEventListener('change', () => {
          this.updateResourceInput(resTypeSelect.value);
        });
    }

    // Form submission handling
    if (canAdd) {
      // ---------------------------- Resource form ----------------------------
      // Populate cohorts list
      const resourceCohorts = this.container.querySelector('#res-cohorts');
      this.populateCohorts(resourceCohorts);

      const resourceForm = this.container.querySelector('#res-form');

      // Form submission handling to create a new resource
      resourceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        // const file = this.container.querySelector('#res-file').files[0];

        const formData = new FormData(resourceForm);

        const file = formData.get('file');
        const mimeType = file.type; // Get the MIME type of the selected file

        let title = formData.get('title').trim();
        if (title === '') {
          // If title is empty, use the file name (without extension) as the title.
          title = file.name.replace(/\.[^/.]+$/, ""); // Remove the extension from the file name, works with files with multiple dots in the name as well;
        }
        const type = formData.get('type').toLowerCase();
        const parentID = this.currentFolderID;
        const accessLevel = formData.get('access').toLowerCase();

        const cohorts = formData.getAll('cohorts');


        const extension = file.name.split('.').pop(); // Get the file extension from the selected file

        this.createNewResource({ title, type, extension, mimeType, parentID, cohorts, accessLevel, file });
      });

      // ---------------------------- Folder form -------------------------------

      // Populate cohorts list with recognised cohorts
      const folderCohorts = this.container.querySelector('#folder-cohorts');

      this.populateCohorts(folderCohorts);

      const folderForm = this.container.querySelector('#folder-form');
      folderForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(folderForm);

        const name = formData.get('name');
        const parentID = this.currentFolderID;
        const accessLevel = formData.get('access').toLowerCase();

        const cohorts = formData.getAll('cohorts');


        this.createNewFolder({ name, parentID, cohorts, accessLevel });
      });
    }
      
    await this.populateFolderContents(current_folder_id);
  }

  async populateFolderContents(folderID) {
    // Start folder population method
    this.currentFolderID = folderID;
    let { resources, folders } = await this.app.folders.listFolderContents(folderID);
    let currentFolder = await this.app.folders.getFolderInfo(folderID);

    let html_dynamic = '';

    html_dynamic += `
    <ul>`;

    let folderPath = currentFolder.path;
    folderPath.forEach(folder =>
      html_dynamic += `
      <li style="display: inline;"><p style="display: inline;">/</p><button data-action="goto-folder" data-id="${folder.id}">${escapeHtml(folder.name)}</button></li>
      `
    )

    html_dynamic += `</ul> <br>`;

    if (resources.length <= 0 && folders.length <= 0) {
      html_dynamic += '<p>No resources in this folder yet.</p>';
    }
    else {
      html_dynamic += '<div class="card">';
      folders.forEach(folder => {
        html_dynamic += `
        <div class="card">
          <button data-action="goto-folder" data-id="${folder.id}">📁: ${escapeHtml(folder.name)}</button> &emsp;
          <button data-action="edit-folder" data-id="${folder.id}">✎ Edit</button>
          <button data-action="delete-folder" data-id="${folder.id}">🗑 Delete</button>
          <p>Access level: ${escapeHtml(folder.accessLevel)} &ensp; | &ensp; Cohorts: ${escapeHtml(folder.cohorts)} </p>
        </div>
      `;
    });

      resources.forEach(resource => {
        html_dynamic += ` 
        <div class="card">
          <h3>${escapeHtml(resource.title)}</h3>
          <p>${escapeHtml(resource.type)}</p>
          <p>Access level: ${escapeHtml(resource.accessLevel)} &ensp; | &ensp; Cohorts: ${escapeHtml(resource.cohorts)}</p>
          <button data-action="download-resource" data-id="${resource.id}">🡓 Download</button> | 
          <button data-action="edit-resource" data-id="${resource.id}" data-uploader="${resource.uploaderID}">✎ Edit</button> | 
          <button data-action="delete-resource" data-id="${resource.id}" data-uploader="${resource.uploaderID}">🗑 Delete</button> &ensp; | &ensp;
          <button data-action="share-resource" data-id="${resource.id}" data-title="${resource.title}">🗐 Copy link</button></p>
        </div>
      `;
    })
  }

  this.container.querySelector('#folder-contents').innerHTML = html_dynamic;

  // Repopulate the contents every time user travels to a new folder
  this.container.querySelectorAll('[data-action="goto-folder"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const folderID = parseInt(event.target.getAttribute('data-id'), 10);
      this.populateFolderContents(folderID); // Recursively populate the clicked folder's contents
    });  
  });

  this.container.querySelectorAll('[data-action="edit-folder"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const folderID = parseInt(event.target.getAttribute('data-id'), 10)
      this.editFolder(folderID)
    })
  })

  this.container.querySelectorAll('[data-action="delete-folder"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const folderID = parseInt(event.target.getAttribute('data-id'), 10)
      this.deleteFolder(folderID)
    })
  })

  this.container.querySelectorAll('[data-action="download-resource"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const resourceID = parseInt(event.target.getAttribute('data-id'), 10);
      this.downloadResource(resourceID);
    });
  });

  this.container.querySelectorAll('[data-action="edit-resource"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const resourceID = parseInt(event.target.getAttribute('data-id'), 10);
      const resourceUploaderID = parseInt(event.target.getAttribute('data-uploader'), 10);
      this.editResource(resourceID, resourceUploaderID);
    });
  });

  this.container.querySelectorAll('[data-action="delete-resource"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      const resourceID = parseInt(event.target.getAttribute('data-id'), 10);
      const resourceUploaderID = parseInt(event.target.getAttribute('data-uploader'), 10);
      this.deleteResource(resourceID, resourceUploaderID);
    });
  });

  this.container.querySelectorAll('[data-action="share-resource"]').forEach( button => {
    button.addEventListener('click', async (event) => {
      const resourceID = parseInt(event.target.getAttribute('data-id'), 10);
      const resourceTitle = event.target.getAttribute('data-title');
      this.shareResourceURL(resourceID, resourceTitle)
    })
  })
}

  // ----------------------- Helper functions --------------------------------------------

  // Populate a select field with recognised cohorts
  async populateCohorts(field) {
    const allCohorts = await this.app.cohort.list(true);

    allCohorts.forEach(cohort => {
      const cohortField = new Option(`${cohort.name} | users: ${cohort.userCount}`, cohort.name);

      field.add(cohortField);
    })
  }

  // Updates the file input of the resource when the resource type is changed
  updateResourceInput(type) {
      const resContainer = this.container.querySelector('#res-input-container');

      switch (type) {
        // NOTE: accept:* enforcements are assists for the file picker, but do not prevent users from selecting other file types. Validation should be implemented further, both server-side and client-side.
      case 'Image':
          resContainer.innerHTML = `
          <label>Image File:</label>
          <input type="file" id="res-file" accept="image/*" name="file" required/> <!-- * Accepts any type of image (png, jpg, etc.) -->
          `;
          break;

      case 'PDF':
          resContainer.innerHTML = `
          <label>PDF File:</label>
          <input type="file" id="res-file" accept=".pdf" name="file" required/>
          `;
          break;

      case 'Audio':
          resContainer.innerHTML = `
          <label>Audio File:</label>
          <input type="file" id="res-file" accept="audio/*" name="file" required/>
          `;
           break;

      case 'Video':
          resContainer.innerHTML = `
          <label>Video File:</label>
          <input type="file" id="res-file" accept="video/*" name="file" required/>
          `;
          break;
      case 'Document':
          resContainer.innerHTML = `
          <label>Document:</label>
          <input type="file" id="res-file" accept=".doc,.docx,.txt,.odt,.rtf" name="file" required/>
          `;
          // List of supported document file types: .doc, .docx, .txt, .odt, .rtf
          break;
      case 'Spreadsheet':
          resContainer.innerHTML = `
          <label>Spreadsheet:</label>
          <input type="file" id="res-file" accept=".xls,.xlsx,.ods,.csv" name="file" required/>
          `;
          // List of supported spreadsheet file types: .xls, .xlsx, .ods, .csv
          break;
      case 'Presentation':
          resContainer.innerHTML = `
          <label>Presentation:</label>
          <input type="file" id="res-file" accept=".ppt,.pptx,.odp,.key" name="file" required/>
          `;
          // List of supported presentation file types: .ppt, .pptx, .odp, .key
          break;
      }
  }

  // ----------------------- Folder handling --------------------------------------------

  async createNewFolder({ name, parentID, cohorts, accessLevel }) {
    this.app.folders.createFolder({ name, parentID, cohorts, accessLevel })
    this.populateFolderContents(this.currentFolderID); // Repopulate folder with current folder to show updated form
  }

  async editFolder(folderID) {
    if (!this.user.isAdmin) {
      alert("You do not have permission to edit this folder. Only an admin can edit it.");
      return;
    }
    
    const newName = prompt("Enter the new name for the folder (leave blank to keep current name):");
    const roles = ['student', 'ranger', 'admin', '']; // Include empty string to allow keeping current access level
    let newAccessLevel = prompt("Enter the new access level for the folder (student, ranger, admin) or leave blank to keep current level:").toLowerCase();

    while (!roles.includes(newAccessLevel)) {
      newAccessLevel = prompt("Invalid access level. Please enter a valid access level (student, ranger, admin) or leave blank to keep current level:").toLowerCase();
    }

    const cohortsRaw = await this.app.cohort.list(true);
    const cohorts = cohortsRaw.map(cohort => cohort.name);

    let newCohortsRaw = prompt("Enter the new cohorts for the folder, separate each cohort by a comma ',' and optionally a space.");
    let newCohorts = newCohortsRaw.split(',').map(cohort => cohort.trim());
    while (!newCohorts.every(cohort => cohorts.includes(cohort)))
    {
      newCohortsRaw = prompt("One or more of the cohorts you entered were not recognised, please try again");
      newCohorts = newCohortsRaw.split(',').map(cohort => cohort.trim());
    }

    try {
      await this.app.folders.editFolder(folderID, { name: newName || undefined, cohorts: newCohorts || undefined, accessLevel: newAccessLevel || undefined });
      this.populateFolderContents(this.currentFolderID); // Repopulate folder with current folder to show updated form
    }
    catch (e) {
      console.error("Error editing folder:", e);
      alert("The folder could not be edited, please try again. If the error persists, please contact a system administrator.");
    }
  }

  // Very dangerous method to delete a folder. TODO: Add some safety to the recursive deletes.. somehow.
  async deleteFolder(folderID) {
    if (!this.user.isAdmin) {
      alert("You do not have permission to edit this folder. Only an admin can edit it.");
      return;
    }


    const {childFolders, childResources} = await this.app.folders.getAllFolderChildren(folderID);

    const childFolderCount = childFolders.length;
    const childResourceCount = childResources.length

    const hasChildren = !(childFolderCount === 0 && childResourceCount === 0);

    if (!hasChildren) // handling for if the folder has no children
    {
      const confirmDelete = confirm("Are you sure you want to delete this folder? This action cannot be undone.")

      if (!confirmDelete) 
      {
        return; // User declined deletion
      }
      else {
        try{
          this.app.folders.deleteFolder(folderID);
          this.populateFolderContents(this.currentFolderID);
        }
        catch (e) {
          console.error("Error deleting folder:", e);
          alert("The folder could not be deleted, please try again. If the error persists, please contact a system administrator.");
        }
      }
    }
    else {
      const confirmDelete = confirm(`Are you sure you want to delete this folder?\n
        WARNING: this will also delete:\n 
        !! ${childFolderCount} sub-folders and \n
        !! ${childResourceCount} resources within them.`)

      if (!confirmDelete) 
      {
        return; // User declined deletion
      }
      else {
        try{
          for (const resource of childResources)
          {
            this.app.resources.deleteResource(resource.id);
          }

          for (const folder of childFolders)
          {
            this.app.folders.deleteFolder(folder.id);
          }
          this.app.folders.deleteFolder(folderID);

          this.populateFolderContents(this.currentFolderID);
        }
        catch (e) {
          console.error("Error deleting the folder or a child:", e);
          alert("The folder could not be deleted. If the error persists, please contact a system administrator.");
      }
        
      }
    }
  }

  // ----------------------- Resource handling -------------------------------------------

  async createNewResource({ type, title, extension, mimeType, parentID, cohorts, accessLevel, file}) {
    try {
      await this.app.resources.createResource({type, title, extension, mimeType, parentID, cohorts, accessLevel, file});
      
      await this.populateFolderContents(this.currentFolderID); // Repopulate folder with current folder to show updated form.
      return;
    }
    catch (e) {
      console.error("Error creating resource:", e);
      alert("The resource could not be uploaded, please try again. If the error persists, please contact a system administrator.");
    }
  }

  // Handling for downloading a specified resource
  async downloadResource(resourceID) {
    try {
      await this.app.resources.downloadResource(resourceID);
    }
    catch (e) {
      console.error("Error downloading resource:", e);
      alert("The resource could not be downloaded, please try again. If the error persists, please contact a system administrator.");
    }
  }

  // Handling for editing a resource
  async editResource(resourceID, resourceUploaderID) {
    // Permission check
    if (resourceUploaderID !== this.user.user_id && !this.user.isAdmin) {
      alert("You do not have permission to edit this resource. Only the uploader or an admin can edit it.");
      return;
    }

    // Get new resource information with prompts (temp back-end solution)
    const newTitle = prompt("Enter the new title for the resource (leave blank to keep current title):");
    // Valid roles - includes empty string to allow keeping current access level
    const roles = ['student', 'ranger', 'admin', '']; 
    let newAccessLevel = prompt("Enter the new access level for the resource (student, ranger, admin) or leave blank to keep current level:").toLowerCase();

    // Ensure entered role is a valid role (won't be needed if UI is replaced with drop-down, this is only present due to typing the role)
    while (!roles.includes(newAccessLevel)) {
      newAccessLevel = prompt("Invalid access level. Please enter a valid access level (student, ranger, admin) or leave blank to keep current level:").toLowerCase();
    }

    const cohortsRaw = await this.app.cohort.list(true);
    let cohorts = cohortsRaw.map(cohort => cohort.name);
    cohorts.push('');

    let newCohortsRaw = prompt("Enter the new cohorts for the resource, separate each cohort by a comma ',' and optionally a space.");
    let newCohorts = newCohortsRaw.split(',').map(cohort => cohort.trim());
    while (!newCohorts.every(cohort => cohorts.includes(cohort)))
    {
      newCohortsRaw = prompt("One or more of the cohorts you entered were not recognised, please try again");
      newCohorts = newCohortsRaw.split(',').map(cohort => cohort.trim());
    }

    try {
      await this.app.resources.editResource(resourceID, { title: newTitle || undefined, cohorts: newCohorts || undefined, accessLevel: newAccessLevel || undefined });
      this.populateFolderContents(this.currentFolderID); // Repopulate folder with current folder to show updated form
    }
    catch (e) {
      console.error("Error editing resource:", e);
      alert("The resource could not be edited, please try again. If the error persists, please contact a system administrator.");
    }
  }

  // Handling for deleting a resource
  async deleteResource(resourceID, resourceUploaderID) {
    // Check the user has permission for deletion of this resource
    if (resourceUploaderID !== this.user.user_id && !this.user.isAdmin) {
      alert("You do not have permission to delete this resource. Only the uploader or an admin can delete it.");
      return;
    }

    // Confirmation
    const confirmDelete = confirm("Are you sure you want to delete this resource? This action cannot be undone.");
    if (!confirmDelete) {
      return; // User cancelled the deletion
    }
    else {
      try {
        await this.app.resources.deleteResource(resourceID);
        this.populateFolderContents(this.currentFolderID); // Repopulate folder with current folder to show updated form
      }
      catch (e) {
        console.error("Error deleting resource:", e);
        alert("The resource could not be deleted, please try again. If the error persists, please contact a system administrator.");
      }
    }
  }

  // Functionality for sharing resources with URL
  async shareResourceURL(resourceID, resourceTitle) {
    // Copies URL to clipboard
    return await this.app.resources.copyShareURL(resourceID, resourceTitle);
  }
}
