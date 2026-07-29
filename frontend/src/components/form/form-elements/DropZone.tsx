"use client";
import React, { useState, useEffect } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import { useDropzone } from "react-dropzone";
import { FileRejection } from "react-dropzone";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface DropzoneComponentProps {
  onUpload: (file: File) => void;
  onCancel: () => void;
  existingFile?: UploadedFile | null;
}

const DropzoneComponent: React.FC<DropzoneComponentProps> = ({ onUpload, onCancel, existingFile }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    // Reset state when the component opens for a different file
    setUploadedFile(null);
    setErrorMessage(null);
  }, [existingFile]);

  const onDrop = (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (rejectedFiles.length > 0) {
      setErrorMessage("Unsupported file type. Please upload a .pdf, .doc, or .docx file.");
      setUploadedFile(null);
    } else {
      setErrorMessage(null);
      setUploadedFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
    },
  });

  const handleConfirmUpload = () => {
    if (uploadedFile) {
      onUpload(uploadedFile);
    } else {
      setErrorMessage("No valid file selected.");
    }
  };

  const mode = existingFile ? "Update" : "Upload";

  return (
    <ComponentCard title={`${mode} File`}>
      <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-xl hover:border-brand-500">
        <form
          {...getRootProps()}
          className={`dropzone rounded-xl border-dashed border-gray-300 p-7 lg:p-10
            ${isDragActive ? "border-brand-500 bg-gray-100 dark:bg-gray-800" : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"}
          `}
        >
          <input {...getInputProps()} />
          <div className="dz-message flex flex-col items-center">
            <div className="mb-4">
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <svg className="w-8 h-8 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195"
                  />
                  <path d="M12 15L12 2M12 2L15 5.5M12 2L9 5.5" />
                </svg>
              </div>
            </div>
            <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
              {isDragActive ? "Drop Files Here" : `Drag & Drop ${mode} a File`}
            </h4>

            <span className="text-sm text-gray-700 dark:text-gray-400">Only .pdf, .doc, .docx files supported</span>
          </div>
        </form>
      </div>

      {(uploadedFile || existingFile) && (
        <div className="mt-4 text-center">
          <p className="text-gray-700 dark:text-gray-400 pb-4">
            {uploadedFile ? "Selected file:" : "Current file:"}{" "}
            <strong>{uploadedFile?.name || existingFile?.name}</strong>
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <button
              onClick={handleConfirmUpload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              {mode === "Update" ? "Replace File" : "Confirm Upload"}
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-500 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {errorMessage && <div className="text-red-500 text-center mt-4">{errorMessage}</div>}
    </ComponentCard>
  );
};

export default DropzoneComponent;
