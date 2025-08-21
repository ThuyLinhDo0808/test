"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DropzoneComponent from "@/components/form/form-elements/DropZone";
import Button from "@/components/ui/button/Button";
import BasicTableOne from "@/components/tables/BasicTableOne";
import { API_BASE_URL } from "@/lib/constants";
import { UploadedFile } from "@/types/uploaded-file";

export default function UploadContent() {
  const { status } = useSession();
  const router = useRouter();

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileToUpdate, setFileToUpdate] = useState<UploadedFile | null>(null);
  const [showDropzone, setShowDropzone] = useState(false);
  const pollingRefs = useRef<Record<string, NodeJS.Timeout>>({});

  // Authentication check to redirect if not authenticated
  useEffect(() => {
      if (status === "unauthenticated") router.push("/");
    }, [status, router]);

  const inferMimeType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf": return "application/pdf";
      case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      default: return "application/octet-stream";
    }
  };

  const stopPollingIfNone = () => {
    if (Object.keys(pollingRefs.current).length === 0) {
      console.log("All polling stopped: no active tasks.");
    }
  };

  // Poll the task status every 2 seconds
  // Wrappin the polling in the useCallback hook to avoid unnecessary re-creations
  const pollTaskStatus = useCallback(async (taskId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doc/get_task/${taskId}/`);
      const data = await res.json();

      // Update the status of the file
      setUploadedFiles((prev) =>
        prev.map((file) =>
          file.taskId === taskId
            ? { ...file, status: data.task_status }
            : file
        )
      );

      if (data.task_status === "SUCCESS" || data.task_status === "FAILURE") {
        clearTimeout(pollingRefs.current[taskId]);
        delete pollingRefs.current[taskId];
        stopPollingIfNone();
      } else {
        if (pollingRefs.current[taskId]) {
          clearTimeout(pollingRefs.current[taskId]);
        }
        pollingRefs.current[taskId] = setTimeout(() => pollTaskStatus(taskId, fileName), 2000);
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, []);


  // Fetch all files including completed tasks in vector database 
  const fetchCompletedFiles = useCallback(async (): Promise<UploadedFile[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/doc/all_docs/`);
    const { documents } = await res.json();
    return Object.entries(documents).map(([fileName, content]) => ({
      id: fileName,
      name: fileName,
      type: inferMimeType(fileName),
      size: new Blob([(content as string[]).join(" ")]).size,
      status: "SUCCESS",
      taskId: "",
    }));
  }, []);

  // Fetch pending tasks and start polling for their status
  const fetchPendingTasksAndPoll = useCallback(async (): Promise<UploadedFile[]> => {
    const res = await fetch(`${API_BASE_URL}/admin/doc/pending_tasks/`);
    const { tasks } = await res.json();

    const pendingFiles: UploadedFile[] = tasks.map((task: {
      task_id: string;
      file_name: string;
      file_size: number;
      file_type: string;
      status: string;
    }) => {
      const file: UploadedFile = {
        id: task.file_name,
        name: task.file_name,
        type: inferMimeType(task.file_name),
        size: task.file_size,
        status: task.status,
        taskId: task.task_id,
      };

      if (file.taskId && !pollingRefs.current[file.taskId]) {
        pollingRefs.current[file.taskId] = setTimeout(() => pollTaskStatus(file.taskId!, file.name), 2000);
      }

      return file;
    });


    return pendingFiles;
  }, [pollTaskStatus]);

  // Fetch all files and start polling for pending tasks
  const fetchFiles = useCallback(async () => {
    try {
      const completed = await fetchCompletedFiles();
      const pending = await fetchPendingTasksAndPoll();
      setUploadedFiles([...completed, ...pending]);
      if (pending.length === 0) {
        Object.values(pollingRefs.current).forEach(clearTimeout);
        pollingRefs.current = {};
        stopPollingIfNone();
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  }, [fetchCompletedFiles, fetchPendingTasksAndPoll]);

  useEffect(() => {
    if (status === "authenticated") fetchFiles();
  }, [status, fetchFiles]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearTimeout);
      pollingRefs.current = {};
    };
  }, []);

  // Handle file upload
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    if (fileToUpdate) formData.append("id", fileToUpdate.id);

    const res = await fetch(`${API_BASE_URL}/admin/doc/upload_doc/`, {
      method: "POST",
      body: formData,
    });

    // Display information about the uploading file
    const result = await res.json();
    const newFile: UploadedFile = {
      id: file.name,
      name: file.name,
      type: inferMimeType(file.name),
      size: file.size,
      status: "PENDING",
      taskId: result.task_id,
    };
    
    setUploadedFiles((prev) => [newFile, ...prev]);
    if (!pollingRefs.current[result.task_id]) {
      pollingRefs.current[result.task_id] = setTimeout(() => pollTaskStatus(result.task_id, file.name), 2000);
    }
    setShowDropzone(false);
    setFileToUpdate(null);

  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE_URL}/admin/doc/delete_doc/${id}/`, { method: "DELETE" });
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDownload = (fileName: string) => {
    const downloadUrl = `${API_BASE_URL}/admin/doc/download/${encodeURIComponent(fileName)}/`;
    window.open(downloadUrl, "_blank");
  };

  if (status === "loading") return <p>Loading...</p>;

  return (
    <div className="p-8 pt-16">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold dark:text-gray-100">Uploaded Documents</h1>
        <Button
          onClick={() => {
            setFileToUpdate(null);
            setShowDropzone(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Upload File
        </Button>
      </div>

      <BasicTableOne
        uploadedFiles={uploadedFiles}
        handleDelete={handleDelete}
        handleDownload={handleDownload}
      />

      {showDropzone && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => {
            setShowDropzone(false);
            setFileToUpdate(null);
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <DropzoneComponent
              onUpload={handleUpload}
              onCancel={() => {
                setShowDropzone(false);
                setFileToUpdate(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
