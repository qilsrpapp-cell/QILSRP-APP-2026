import express from 'express'
import { auth, verifyAdmin, getAccessLevel } from '../middleware/authorisation.js'
import { verifyFolderData } from '../middleware/data-verification.js'

const router = express.Router();

/**
 * The endpoint at which a new folder can be added
 */
router.post('/create', auth, verifyFolderData, (req, res, next) => {
    const { name, parentID, cohorts, accessLevel } = req.body;

    let currentDate = new Date();

    if (req.role !== 'admin' && req.role !== 'ranger') {
        res.status(403).json({
            error: true,
            message: "Current user is not authorised to add a folder. Only admins and rangers can add folders."
        });
        return;
    }

    // Check the user isn't trying to create a folder they shouldn't (visible to other cohorts or no cohort)
    if(req.role !== 'admin' && (cohorts.length === 0 || cohorts.some(cohort => cohort !== req.cohort)))
    {
        res.status(403).json({
            error: true,
            message: "User does not have permission to create a folder for a different cohort"
        })
    }

    req.db.from("folder").insert({
        folder_id: null,
        name: name,
        parent_id: parentID,
        cohorts: JSON.stringify(cohorts),
        access_level: accessLevel,
        created: currentDate.toISOString().slice(0, 19).replace('T', ' '), // Convert time to MySQL DATETIME format
    })
    .then(() => {
        res.status(201).json({ message: "Folder added successfully" })
    })
    .catch(e => {
        console.log(e.message)
        res.status(500).json({ error: true })
    })
});

/**
 * The endpoint at which a folder's information can be gathered
 */
router.get('/:folderID', auth, getAccessLevel, async (req, res, next) => {
    const folderID = Number.parseInt(req.params.folderID, 10);
    if (Number.isNaN(folderID))
    {
        res.status(400).json({
            error: true,
            message: "Folder ID is invalid"
        });
        return;
    }

    const accessTo = req.accessTo;

    const fields = ['folder_id', 'name', 'parent_id', 'cohorts', 'access_level', 'created'];

    try {
        const folder = await req.db.from("folder").select(fields).where('folder_id', folderID).first()
        
        if (!folder) {
            res.status(404).json({ error: true, message: "Folder not found" });
            return;
        }
        if (!accessTo.includes(folder.access_level)) {
            res.status(403).json({ error: true, message: "User does not have access to view this folder"});
            return;
        }
        // Checks if the user has access to the folder, if the parent_id is null, this is the root folder so allow access
        if (!(folder.parent_id === null || req.role === 'admin' || folder.cohorts.includes(req.cohort)))
        {
            res.status(403).json({ error: true, message: "User's cohort does not have access to view this folder"})
            return;
        }

        let path = [];
        let currentFolder = folder;

        // TODO: Investigate a less intensive method of finding paths, this method involves several db calls.
        while(currentFolder) {
            path.push({
                id: currentFolder.folder_id,
                name: currentFolder.name
            });

            if (currentFolder.parent_id === null) {
                break; // Break after root folder is in path
            }

            currentFolder = await req.db.from("folder").select(fields).where('folder_id', currentFolder.parent_id).first();

            if (!currentFolder) {
                throw new Error("The folder path is invalid."); // Throw error if there was a valid parent_id that doesn't lead to a folder.
            }
        }
        path.reverse();

        const data = {
            id: folderID,
            name: folder.name,
            parentID: folder.parent_id,
            cohorts: folder.cohorts,
            accessLevel: folder.access_level,
            created: folder.created,
            path
        }
        res.json(data)
    }
    catch(e) {
        console.log(e.message)
        res.status(500).json({ error: true })
    }
});


/**
 * The endpoint at which a folder's contents can be retrieved. Does not include paths for subfolders within the called folder.
 */
router.get('/:folderID/contents', auth, getAccessLevel, async (req, res, next) => {
    const folderID = Number.parseInt(req.params.folderID, 10);
    if (Number.isNaN(folderID))
    {
        res.status(400).json({
            error: true,
            message: "Folder ID is invalid"
        });
        return;
    }


    const accessTo = req.accessTo;

    try {
        const fields = ['access_level', 'cohorts', 'parent_id']
        const folder = await req.db.from("folder").select(fields).where("folder_id", folderID).first()
        if (!folder) {
            res.status(404).json({ error: true, message: "Folder not found" });
            return;
        }
        if (!accessTo.includes(folder.access_level)) {
            res.status(403).json({ error: true, message: "User does not have access to view this folder"});
            return;
        }
        // Checks if the user has access to the folder, if the parent_id is null, this is the root folder so allow access
        if (!(folder.parent_id === null || req.role === 'admin' || folder.cohorts.includes(req.cohort)))
        {
            res.status(403).json({ error: true, message: "User's cohort does not have access to view this folder"})
            return;
        }
    
        const resourceRows = await req.db.from("resource").select("*").where("parent_id", folderID).whereIn("access_level", accessTo);

        const resources = resourceRows.filter(resource =>
            req.role === 'admin' || resource.cohorts.includes(req.cohort)
        ).map(resource => ({
            id: resource.resource_id,
            type: resource.type,
            title: resource.title,
            uploaderID: resource.uploader_id,
            fileRef: resource.file_ref,
            parentID: resource.parent_id,
            cohorts: resource.cohorts,
            accessLevel: resource.access_level,
            created: resource.created
        }))

        const folderRows = await req.db.from("folder").select("*").where("parent_id", folderID).whereIn("access_level", accessTo);
        

        const folders = folderRows.filter(folder =>
            req.role === 'admin' || folder.cohorts.includes(req.cohort)
        ).map(folder => ({
            id: folder.folder_id,
            name: folder.name,
            parentID: folder.parent_id,
            cohorts: folder.cohorts,
            accessLevel: folder.access_level,
            created: folder.created
        }));

        res.status(200).json({ folders, resources });
    }
    catch(e) {
        console.log(e.message)
        res.status(500).json({ error: true })
    }
});

router.put('/:folderID/edit', auth, getAccessLevel, async (req, res, next) => {
    const folderID = Number.parseInt(req.params.folderID, 10);
    if (Number.isNaN(folderID))
    {
        res.status(400).json({
            error: true,
            message: "Folder ID is invalid"
        });
        return;
    }
    const { name, cohorts, accessLevel } = req.body;

    console.log('Attempting to edit folder with ID:', folderID);

    const fields = ['name', 'cohorts', 'access_level'];

    const current_folder = await req.db.from("folder").select(fields).where('folder_id', folderID).first();

    // Check user has permissions to update this folder
    if (!req.accessTo.includes(current_folder.access_level)) {
        res.status(403).json({ error: true, message: "User does not have permission to update this folder" });
        return;
    }

    // Verify the user isn't attempting to give the folder an accessLevel higher than their own
    if (accessLevel && !req.accessTo.includes(accessLevel)) {
        res.status(403).json({ error: true, message: "User does not have permission to update folder to specified access level" });
        return;
    }

    // Check if the user is an admin. NOTE: Currently folders do not track or care about who created them.
    if (!req.accessTo.includes('admin')) {
        res.status(403).json({ error: true, message: "User does not have permission to update this folder" });
        return;
    }

    if (req.role !== 'admin' && (cohorts.length === 0 || cohorts.some(cohort => cohort !== req.cohort)))
    {
        res.status(403).json({ error: true, message: "User does not have permission to edit a folder to include a cohort they are not in."})
        return;
    }

    // Update folder information
    try {
        const result = await req.db.from("folder").where('folder_id', folderID).update({
            name: name || current_folder.title,
            cohorts: JSON.stringify(cohorts) || current_folder.cohorts,
            access_level: accessLevel || current_folder.access_level
        });
        res.json({ message: "Resource updated successfully" });
    }
    catch (e) {
        console.log(e.message)
        res.status(500).json({ error: true, message: "Failed to update folder" })
    }
});

router.delete('/:folderID/delete', auth, verifyAdmin, getAccessLevel, async (req, res, next) => {
     const folderID = Number.parseInt(req.params.folderID, 10);
    if (Number.isNaN(folderID))
    {
        res.status(400).json({
            error: true,
            message: "Folder ID is invalid"
        });
        return;
    }

    // Check if user is admin (only admins can delete folders at this time)
    if(!req.accessTo.includes('admin'))
    {
        res.status(403).json({ error: true, message: "User does not have permission to delete this folder" });
        return;
    }

    console.log('Attempting to delete folder with ID:', folderID);

    try {
        // Check user has permission to delete folder, then delete from SQL table
        const response = await req.db.from("folder").where('folder_id', folderID)
        .andWhere(function () {
            // Extra access check. This is where uploader or cohort checks could be added in the future, if non-admins are to be allowed to delete folders.
            this.whereIn('access_level', req.accessTo);
        })
        .del();

        res.json({ message: "Folder deleted successfully" });
    }
    catch (e) {
        console.log(e.message)
        res.status(500).json({ error: true, message: "Failed to delete folder" })
    }
})

export default router