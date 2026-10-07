import Resource from '../model/Resource.js';
import Folder from '../model/Folder.js';


export default class FolderController {
    constructor(apiClient) {
        this.api = apiClient;
    }


    /**
     * List the contents of a folder by the provided folderID
     * @param {int} folderID - the id of the folder to list the contents of
     * @returns {Promise<{folders: Folder[], resources: Resource[]}>}- Returns an array of Folder objects and an array of Resource objects that have the parentID correlating to the provided folderID
     */
    async listFolderContents(folderID) {
        let {folders, resources} = await this.api.get(`/folder/${folderID}/contents`, {auth: true});

        folders = folders.map(row => new Folder(row));
        resources = resources.map(row => new Resource(row));

        return { folders, resources };
    }

    /**
     * Gets information relating to a folder
     * @param {int} folderID - id of the folder to get information of
     * @returns {Promise<Folder>} - Folder object containing the information of the folder
     */
    async getFolderInfo(folderID) {
        const folder =  await this.api.get(`/folder/${folderID}`, {auth: true});
        return new Folder(folder)
    }

    /** 
     * Gets all the children within a folder. TODO: Make this a backend route to avoid numerous API calls
     */
    async getAllFolderChildren(folderID) {        
        let {folders, resources} = await this.api.get(`/folder/${folderID}/contents`, {auth: true});

        let childFolders = folders.map(row => new Folder(row));
        let childResources = resources.map(row => new Resource(row));

        for (const folder of folders) 
        {
            const children = await this.getAllFolderChildren(folder.id)

            childFolders = [...childFolders, ...children.childFolders];
            childResources = [...childResources, ...children.childResources]
        }
                
        return {childFolders, childResources}
    }

    /**
     * Creates a new folder in the database
     * @param {string} name - Name of the folder
     * @param {int} parentID - id of the folder this subfolder resides in.
     * @param {string} accessLevel - accessLevel of the folder, either 'student', 'ranger' or 'admin'. Defaults to 'student'
     * @returns 
     */
    async createFolder({ name, parentID, cohorts, accessLevel = 'student'} )
    {
        return this.api.post(`/folder/create`, { name, parentID, cohorts, accessLevel }, { auth: true });
    }

    async editFolder(folderID, { name, cohorts, accessLevel })
    {
        return this.api.put(`/folder/${folderID}/edit`, {name, cohorts, accessLevel}, {auth: true});
    }

    async deleteFolder(folderID)
    {
        return this.api.delete(`/folder/${folderID}/delete`, {}, {auth: true})
    }
    
}