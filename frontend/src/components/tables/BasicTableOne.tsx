// BasicTableOne.tsx
import { Table, TableHeader, TableBody, TableCell, TableRow } from "@/components/ui/table";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import { UploadedFile } from "@/types/uploaded-file";
import Image from "next/image";
type BasicTableOneProps = {
  uploadedFiles: UploadedFile[];
  handleDelete: (id: string) => void;
};
export default function BasicTableOne({ uploadedFiles, handleDelete, handleDownload }: BasicTableOneProps & { handleDownload: (fileName: string) => void }) {
  return (
      <Table>
        {/* Table Header */}
        <TableHeader>
          <TableRow>
            <TableCell isHeader className="px-5 py-3 text-start text-gray-500 dark:text-gray-400">
              File Name
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-start text-gray-500 dark:text-gray-400">
              Size
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-start text-gray-500 dark:text-gray-400">
              File Type
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-start text-gray-500 dark:text-gray-400">
              Status
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-start text-gray-500 dark:text-gray-400">
              Actions
            </TableCell>
          </TableRow>
        </TableHeader>

        {/* Table Body */}
        <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {uploadedFiles.length > 0 ? (
            uploadedFiles.map((file, idx) => (
              <TableRow key={file.id ?? idx}>
                {/* File Name */}
                <TableCell className="px-5 py-4 sm:px-6 text-start">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {file.name}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Size */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown"}
                </TableCell>

                {/* File Type */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    {file.type === "application/pdf" ? (
                      <Image src="images/task/pdf.svg" alt="PDF" width={70} height={70} />
                    ) : file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ? (
                      <Image src="images/task/word.svg" alt="WORD" width={70} height={70} />
                    ) : (
                      <span className="text-xs">{file.type || "Unknown"}</span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <Badge
                    size="sm"
                    color={
                      file.status === "SUCCESS"
                        ? "success"
                        : file.status === "FAILURE"
                        ? "error"
                        : "warning"
                    }
                  >
                    {file.status || "Pending"}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                      disabled={file.status === "PENDING" }
                    >
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDelete(file.id)}
                      disabled= {file.status === "PENDING" }
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                No files uploaded yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

  );
}
