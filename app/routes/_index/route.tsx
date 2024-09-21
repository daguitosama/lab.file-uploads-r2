import mjHeaders from "@mjackson/headers";
import { ActionFunctionArgs } from "@remix-run/node";
import { json, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import { FilePondUploads } from "../uploads/route";
import { uploadHandlerForSeveralParts } from "../uploads/uploadHandler";

export default function FormWithPond() {
    const fetcher = useFetcher<typeof action>();
    const uploadResult = fetcher.data;
    const isLoading = fetcher.state != "idle";
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        if (!isHydrated) {
            setIsHydrated(true);
        }
    }, []);
    return (
        <div className="max-w-3xl px-10 py-10 mx-auto">
            <h1 className=" text-xl font-bold">File uploads to R2</h1>

            <fetcher.Form
                method="POST"
                encType={!isHydrated ? "multipart/form-data" : "application/x-www-form-urlencoded"}
            >
                <div className="mt-10">
                    <FilePondUploads />
                </div>
                <button className="mt-10 w-full bg-black text-white font-medium px-5 py-2 rounded-xl">
                    Save
                </button>
            </fetcher.Form>

            <div className="mt-20">
                {isLoading ? (
                    <p>Loading uploaded data</p>
                ) : (
                    <p>After submitting the form your hosted files would pop up here</p>
                )}
                {typeof uploadResult != "undefined" ? (
                    uploadResult?.type == "success" ? (
                        <div className="mt-5">
                            <ul className=" grid  gap-2">
                                {/* @ts-ignore */}
                                {uploadResult.fileUrls.map((fileUrl) => {
                                    return (
                                        <li key={fileUrl}>
                                            <a
                                                href={fileUrl}
                                                className="w-40 h-auto text-blue-600 underline"
                                            >
                                                {" "}
                                                {fileUrl}{" "}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : (
                        <div>
                            {/* @ts-ignore */}
                            Error: {uploadResult.error}
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}

export async function action({ request }: ActionFunctionArgs) {
    const contentType = parseContentType(request);
    if (!contentType) {
        return new Response("You are not coming from a valid browser so chill", { status: 400 });
    }
    // await new Promise((res) => setTimeout(res, 200_000));

    // url encoded signals files all ready have been uploaded
    // with the form are coming just the file url references
    if (contentType == ExpectedContentTypes.urlEncoded) {
        const formData = await request.formData();
        const fileUrls = formData.getAll("filepond");
        if (!formEntryValuesAreStrings(fileUrls)) {
            return json(
                { type: "error", error: "Non valid upload ids", ok: false },
                { status: 400 }
            );
        }
        return json({
            type: "success",
            fileUrls,
        });
    }
    // multipart data signals that files have not been uploaded
    // this is the baseline no js available on the client avenue
    if (contentType == ExpectedContentTypes.multipartData) {
        const uploadBatchResult = await uploadHandlerForSeveralParts(request);
        if (uploadBatchResult.isErr) {
            return new Response("It failed to upload your files", { status: 500 });
        }
        return json({
            type: "success",
            fileUrls: uploadBatchResult.value,
        });
    }

    return new Response("This is not coming my code so chill", { status: 400 });
}

function formEntryValuesAreStrings(entries: FormDataEntryValue[]): entries is string[] {
    for (let i = 0; i < entries.length; i++) {
        const fileUrl = entries[i];
        if (typeof fileUrl != "string") {
            return false;
        }
    }
    return true;
}

enum ExpectedContentTypes {
    urlEncoded = "application/x-www-form-urlencoded",
    multipartData = "multipart/form-data",
}

function parseContentType(request: Request) {
    const headers = new mjHeaders(request.headers);
    const contentType = headers.contentType.mediaType;
    if (contentType == ExpectedContentTypes.multipartData) {
        return ExpectedContentTypes.multipartData;
    }
    if (contentType == ExpectedContentTypes.urlEncoded) {
        return ExpectedContentTypes.urlEncoded;
    }
    return null;
}
