import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    requestChecksumCalculation: 'WHEN_REQUIRED'
});

export default s3;


