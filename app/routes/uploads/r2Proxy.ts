import { PutObjectCommand, PutObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import { MultipartPart } from "@mjackson/multipart-parser";
import * as fs from "fs";
import * as fsp from "fs/promises";
import tmp from "tmp";
import { Result } from "true-myth";
import { v4 as uuid } from "uuid";
//
const CF_R2_ENDPOINT = process.env.CF_R2_ENDPOINT!;
const BUCKET_NAME = process.env.CF_R2_BUCKET_NAME!;
const CF_R2_ACCESS_KEY_ID = process.env.CF_R2_ACCESS_KEY_ID!;
const CF_R2_SECRET_ACCESS_KEY = process.env.CF_R2_SECRET_ACCESS_KEY!;
const CF_R2_BUCKET_ORIGIN = process.env.CF_R2_BUCKET_ORIGIN!;

const r2Client = new S3Client({
    region: "auto",
    endpoint: CF_R2_ENDPOINT,
    credentials: {
        accessKeyId: CF_R2_ACCESS_KEY_ID,
        secretAccessKey: CF_R2_SECRET_ACCESS_KEY,
    },
});

// if something is not working, check you are setting this right
// console.log({
//     CF_R2_ENDPOINT,
//     BUCKET_NAME,
//     CF_R2_ACCESS_KEY_ID,
//     CF_R2_SECRET_ACCESS_KEY,
//     CF_R2_BUCKET_ORIGIN,
// });

export async function upload(multipart: MultipartPart): Promise<Result<string, Error>> {
    console.log("upload running");
    let tmpfile;
    try {
        tmpfile = tmp.fileSync({ keep: true });
        // console.log("temp file created");
        const contentType = multipart.headers.get("ContentType") || "";
        // console.log("contentType: " + contentType);

        if (!multipart.filename) {
            return Result.err(new Error("Unable to process a MultipartPart with out filename"));
        }

        const safeFileName = `${uuid()}${getFileExtension(multipart.filename)}`;

        if (!safeFileName) {
            return Result.err(new Error("Unable to process a file name with out extension"));
        }

        let { bytes, readStream } = await writeFile(tmpfile.name, multipart.body);

        // console.log("temp file written: " + safeFileName);

        const uploadParams: PutObjectCommandInput = {
            Bucket: BUCKET_NAME,
            Key: safeFileName,
            Body: readStream,
            ContentLength: bytes,
            ContentType: "application/octet-stream",
        };

        // console.log("Setting upload params as: ");
        // console.log(JSON.stringify(uploadParams, null, 2));

        const uploadCommand = new PutObjectCommand(uploadParams);

        console.log("Sending upload command ");

        const result = await r2Client.send(uploadCommand);

        // console.log("Result obtained as: ");
        // console.log(JSON.stringify({ result }, null, 2));

        // console.log("Tmp file: ");
        // console.log(JSON.stringify({ tmpfile }, null, 2));

        // return the juice
        return Result.ok(`${CF_R2_BUCKET_ORIGIN}${safeFileName}`);
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            return Result.err(error);
        }

        return Result.err(new Error("Known Unknown Server Error while uploading to R2"));
    } finally {
        // cleaning sequence
        if (tmpfile && fs.existsSync(tmpfile.name)) {
            await fsp.unlink(tmpfile.name);
        }
    }
}

const ALLOWED_MAX_FILE_SIZE = 1024 * 1024 * 30; // 30 Mb

async function writeFile(filename: string, stream: ReadableStream<Uint8Array>) {
    let file = fs.createWriteStream(filename);
    let bytesWritten = 0;
    /* @ts-ignore */
    for await (let chunk of stream) {
        if (bytesWritten + chunk.byteLength > ALLOWED_MAX_FILE_SIZE) {
            file.end();
            throw new Error("File size exceded ALLOWED_MAX_FILE_SIZE");
        }
        file.write(chunk);
        bytesWritten += chunk.byteLength;
    }

    file.end();
    // let readStream = fs.createReadStream(filename);
    let readStream = fs.createReadStream(filename);
    return { bytes: bytesWritten, readStream };
}

function getFileExtension(filename: string): string | null {
    const index = filename.lastIndexOf(".");
    if (index == -1) {
        return null;
    }
    return filename.slice(index);
}
