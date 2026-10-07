import Resource from '../model/Resource.js';

export default class ResourceController {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Gets a Resource object from the database using the resource's id as a reference. TODO: Test this.
   * @param {int} resourceID 
   * @returns Resource object containing the info of the specified resource
   */
  async getResource(resourceID)
  {
    const resource =  await this.api.get(`/resource/${resourceID}`, {auth: true});
    return resource.map(row => new Resource(row));
  }

  /**
   * Temp and not great function to check if provided access parameters would give access to a resource
   * @param {*} resourceID 
   * @param {*} userLevel 
   * @param {*} cohort 
   * @returns 
   */
  checkAccess(resourceID, userLevel, cohort = 'null')
  {
    // Override for admins, always have access
    if(userLevel.toLowerCase() === 'admin') { return true; }

    // Cannot await getting the resource in the current pipeline, so this functionality doesn't work.
    
    // const resource = this.getResource(resourceID);

    // const hasLevel = (resource.accessLevel === 'student') || (resource.accessLevel === 'ranger' && userLevel === 'ranger');

    // const inCohort = (resource.cohorts.includes(cohort));
    return true;
  }

  /**
   * Downloads a resource from S3, currently does this by opening the pre-signed URL in a new tab, allowing the user to download it from there
   * @param {*} resourceID 
   */
  async downloadResource(resourceID) {
    try {
      const response = await this.api.get(`/resource/${resourceID}/download`, { auth: true });

      const downloadURL = response.downloadURL;
      const downloadResponse = await fetch(downloadURL, {
        method: 'GET'
      });

      window.open(downloadURL, '_blank'); // Open the download URL in a new tab to trigger the download without navigating away from the current page

      if (!downloadResponse.ok) {
        throw new Error(`Failed to download resource from S3 (${downloadResponse.status})`);
      }
    }
    catch (e) {
      console.error("Error downloading resource:", e);
    }
  }

  /**
   * Creates a new Resource in the database and returns a presigned URL for uploading the resource file to S3. The file must be uploaded to the returned URL before the resource can be used.
   * @param {*} param0 - Object contiaing relevant Resource Info
   * @returns The presigned URL for uploading the resource file and the ID of the newly created resource in the database
   */
  async createResource({type, title, extension, mimeType, parentID, cohorts, accessLevel, file}) {
    try {
      const response = await this.api.post('/resource/create', { type, title, extension, mimeType, parentID, cohorts, accessLevel }, { auth: true });
      const uploadURL = response.uploadURL;
      const resourceID = response.resourceID;

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType
        },
        body: file // Upload the selected file to S3 using the presigned URL
      });

      if (!uploadResponse.ok) {
        // TEMP
        const errorBody = await uploadResponse.text();

        console.error('S3 upload failed:', {
          status: uploadResponse.status,
          headers: [...uploadResponse.headers.entries()],
          body: errorBody
        });

        throw new Error(`S3 upload failed (${uploadResponse.status})`);

        // END TEMP
        throw new Error('Failed to upload file to S3');
      }

      console.log(`File uploaded successfully to S3 for resource ID: ${resourceID}`);
      await this.completeResource(resourceID);
      return;
    }
    catch (e) {
      console.error("Error creating resource:", e);
    }    
    return;
  }

  /**
   * Marks a resource as complete after its file has been uploaded to S3.
   * @param {int} resourceID 
   * @returns A promise resolving to the result of the update operation
   */
  async completeResource(resourceID) {
    return await this.api.put(`/resource/${resourceID}/complete`, {}, { auth: true });
  }

  /**
   * Edits a resource's editable fields (title and accessLevel) in the database. Only the uploader of the resource or an admin can edit a resource.
   * @param {*} resourceID - Id of the resource to be edited
   * @param {*} param1 - Object containing the new title and/or accessLevel for the resource. If a field is not provided, it will not be changed.
   * @returns 
   */
  async editResource(resourceID, { title, cohorts, accessLevel }) {
    return await this.api.put(`/resource/${resourceID}/edit`, { title, cohorts, accessLevel }, { auth: true });
  }

  /**
   * Deletes a resource from the database.
   * @param {*} resourceID - Id of the resource to be deleted
   * @returns 
   */
  async deleteResource(resourceID) {
    return await this.api.delete(`/resource/${resourceID}/delete`, {}, { auth: true });
  }

/**
 * Gets a shareable URL for the resource, copying it to the users keyboard. Relies on the window being associated with the domain, so old links will break in the event the domain changes.
 * People that recieve the URL still need to log in and have appropriate access to download the resource.
 * @param {*} resourceID - ID of the resource to generate a URL for
 * @param {*} resourceTitle 
 * @returns 
 */
  async copyShareURL(resourceID, resourceTitle = '') {
    const shareURL = `${window.location.origin}/resource/share/${resourceID}/${resourceTitle}`;

    return await navigator.clipboard.writeText(shareURL);
  }
}