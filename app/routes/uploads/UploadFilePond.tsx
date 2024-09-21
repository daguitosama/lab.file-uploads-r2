// Import React FilePond
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import { FilePond, registerPlugin } from "react-filepond";

// Import FilePond styles
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import "filepond/dist/filepond.min.css";
import { useState } from "react";
import "./custom-file-pond-styles.css";

// Register the plugins
registerPlugin(FilePondPluginImagePreview);
export function FilePondUploads() {
    const [files, setFiles] = useState([]);
    return (
        <div>
            <FilePond
                files={files}
                // @ts-ignore
                onupdatefiles={setFiles}
                allowMultiple={true}
                acceptedFileTypes={["image/* .pdf"]}
                maxFiles={10}
                server={`/uploads?_data=routes${encodeURI("/uploads")}`}
                credits={false}
                imagePreviewHeight={130}
                labelIdle={` <div class="flex flex-col items-center justify-center text-center"> Drag & Drop your files or<span class="filepond--label-action"> Browse</span></div>`}
            />
            <div className="flex items-center justify-end pt-1 pr-2">
                <p className=" text-xs ">{files.length} of 10</p>
            </div>
        </div>
    );
}
