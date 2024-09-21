import { parseMultipartRequest } from "@mjackson/multipart-parser";
import { Result } from "true-myth";
import { upload } from "./r2Proxy";
export async function uploadHandlerForSinglePart(request: Request): Promise<Result<string, Error>> {
    for await (let part of parseMultipartRequest(request)) {
        if (!part.isFile) continue;
        if (!isExpectedFile(part.mediaType || "")) continue;
        const upLoadResult = await upload(part);
        if (upLoadResult.isErr) {
            return Result.err(upLoadResult.error);
        }
        return Result.ok(upLoadResult.value);
    }
    return Result.err(new Error("Upload Handler did not found a file part on the request"));
}

export async function uploadHandlerForSeveralParts(
    request: Request
): Promise<Result<string[], Error>> {
    const uploadUrls: string[] = [];
    for await (let part of parseMultipartRequest(request)) {
        if (!part.isFile) continue;
        if (!isExpectedFile(part.mediaType || "")) continue;

        const upLoadResult = await upload(part);
        if (upLoadResult.isErr) {
            return Result.err(upLoadResult.error);
        }
        uploadUrls.push(upLoadResult.value);
    }
    return Result.ok(uploadUrls);
}

function isExpectedFile(mediaType: string) {
    const imageMatch = mediaType.match("image/");
    const pdfMatch = mediaType.match("application/pdf");
    const adobeFilesMatch = mediaType.match("application/postscript");
    const isExpected = Boolean(imageMatch || pdfMatch || adobeFilesMatch);
    return isExpected;
}
