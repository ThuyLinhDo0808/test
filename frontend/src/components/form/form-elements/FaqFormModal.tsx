"use client";
import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";

type FaqFormModalProps = {
  isOpen: boolean;
  initialData?: {
    id?: string;
    question: string;
    answer: string;
  };
  onSubmit: (faq: { question: string; answer: string }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

export default function FaqFormModal({
  isOpen,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false, // ✅ default to false
}: FaqFormModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setQuestion(initialData.question);
        setAnswer(initialData.answer);
      } else {
        setQuestion("");
        setAnswer("");
      }
    }
  }, [initialData, isOpen]);

  const handleSubmit = () => {
    if (question.trim() === "" || answer.trim() === "") return;
    onSubmit({ question, answer });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className={`p-6 space-y-4 w-5/6 lg:w-[800px] max-w-full h-full ${isSubmitting ? "opacity-70 pointer-events-none" : ""}`}>
        <h2 className="text-xl font-semibold dark:text-gray-100">
          {initialData ? "Update FAQ" : "Add New FAQ"}
        </h2>

        <div>
          <Label>Question</Label>
          <TextArea
            className="custom-scrollbar resize-none overflow-y-auto w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white p-3"
            rows={3}
            value={question}
            onChange={(val) => setQuestion(val)}
            placeholder="Enter the FAQ question..."
            disabled={isSubmitting}
          />
        </div>

        <div>
          <Label>Answer</Label>
          <TextArea
            className="custom-scrollbar resize-none overflow-y-auto w-full rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white p-3"
            rows={6}
            value={answer}
            onChange={(val) => setAnswer(val)}
            placeholder="Enter the FAQ answer..."
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting} // Optional: leave enabled if you want Cancel to always work
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || question.trim() === "" || answer.trim() === ""}
          >
            {isSubmitting
              ? initialData
                ? "Updating..."
                : "Adding..."
              : initialData
              ? "Update"
              : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
