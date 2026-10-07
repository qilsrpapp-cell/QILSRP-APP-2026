import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3 from '../s3.js';

async function generateUploadURL(key, mimeType) {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ContentType: mimeType
    });

    console.log(`Generating presigned URL for resource ID: ${key} with MIME type: ${mimeType}`);

    const uploadURL = await getSignedUrl(s3, command, {
        expiresIn: 300
    });
    return uploadURL;
}

async function generateDownloadURL(key, title, extension, mimeType ) {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: `inline; filename="${title}.${extension}"`, // Make the file open in the browser if possible, and set the filename for download
        ResponseContentType: mimeType
    });

    console.log(`Generating presigned download URL for resource ID: ${key} with MIME type: ${mimeType}`);

    const downloadURL = await getSignedUrl(s3, command, {
        expiresIn: 300
    });
    return downloadURL;
}

async function deleteResourceFromS3(key) {
    const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    });
    const response = await s3.send(command);

    return response; // Return the response from S3, which may contain metadata about the deletion
}

export { generateUploadURL, generateDownloadURL, deleteResourceFromS3 };