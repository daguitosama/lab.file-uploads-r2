import { isMultipartRequest } from "@mjackson/multipart-parser";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { uploadHandlerForSinglePart } from "./uploadHandler";

// Import React FilePond
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";

import { FilePond, registerPlugin } from "react-filepond";

// Import FilePond styles
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";
import { useState } from "react";
import { useIsHydrated } from "~/hooks/useIsHydrated";
import "./custom-file-pond-styles.css";

// Register the plugins
registerPlugin(
    FilePondPluginImagePreview,
    FilePondPluginFileValidateSize,
    FilePondPluginFileValidateType
);

export function FilePondUploads() {
    const isHydrated = useIsHydrated();
    const [files, setFiles] = useState([]);
    return (
        <div>
            <FilePond
                files={files}
                // @ts-ignore
                onupdatefiles={setFiles}
                allowMultiple={true}
                acceptedFileTypes={["image/*", "application/pdf", "application/postscript"]}
                maxFiles={10}
                server={`/uploads?_data=routes${encodeURI("/uploads")}`}
                credits={false}
                imagePreviewHeight={130}
                storeAsFile
                maxFileSize="30MB"
                name="filepond"
                labelIdle={` <div class="flex flex-col items-center justify-center text-center"> Drag & Drop your files or<span class="filepond--label-action"> Browse</span></div>`}
            />
            <div className="justify-end pt-1 pr-2 text-xs ">
                <div>
                    {isHydrated ? (
                        <p className=" ">
                            {files.length} of 10 (Images, Pdf, or Adobe Software files)
                        </p>
                    ) : (
                        <p>Up to 10 files. (Images, Pdf, or Adobe Software files)</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export async function action({ request }: ActionFunctionArgs) {
    if (request.method == "DELETE") {
        console.log(request.method);
        return json(
            {
                result: "ok",
            },
            { status: 200 }
        );
    }

    if (request.method != "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    let isMultiParseRequest = isMultipartRequest(request);
    if (!isMultiParseRequest) {
        return new Response("Bad payload data", { status: 400 });
    }
    const uploadResult = await uploadHandlerForSinglePart(request);
    if (uploadResult.isErr) {
        return json({ result: "fail" }, { status: 500 });
    }
    return new Response(uploadResult.value, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
    });
}
