// (CSR) Client-side component for the manage FAQs page
"use client";

import React, { useState } from "react";
import FaqFormModal from "@/components/form/form-elements/FaqFormModal";
import Button from "@/components/ui/button/Button";
import { useModal } from "@/hooks/useModal";
import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/constants";

type Faq = {
  id: string;
  question: string;
  answer: string;
};

export default function ManageFaqsContent() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const { isOpen, openModal, closeModal } = useModal();
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    fetch(`${API_BASE_URL}/admin/faqs`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched data:", data); // debug line
        setFaqs(data.faqs); //  access the array inside
      });
  }, []);
  
  
  const handleAdd = () => {
    setEditingFaq(null);
    openModal();
  };

  const handleEdit = (faq: Faq) => {
    setEditingFaq(faq);
    openModal();
  };

  const handleSubmit = async (newFaq: { question: string; answer: string }) => {
    setIsSubmitting(true); // 🔒 Disable UI

    try {
      if (editingFaq?.id) {
        await fetch(`${API_BASE_URL}/admin/faqs/${editingFaq.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newFaq),
        });
      } else {
        await fetch(`${API_BASE_URL}/admin/faqs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newFaq),
        });
      }

      await fetch(`${API_BASE_URL}/admin/faqs`)
        .then((res) => res.json())
        .then((data) => setFaqs(data.faqs));
    } catch (err) {
      console.error("FAQ update error:", err);
    }

    setIsSubmitting(false); // 🔓 Re-enable UI
    setEditingFaq(null);
    closeModal();
  };


  const handleCancel = () => {
    closeModal();
    setEditingFaq(null);
  };

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE_URL}/admin/faqs/${id}`, { method: "DELETE" });
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  };
  

  return (
    <div className="flex items-center justify-center pt-12">
      <div className="p-6 space-y-6 w-5/6 lg:w-[800px] max-w-full h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold dark:text-gray-50">Manage FAQs</h1>
        <Button onClick={handleAdd}>+ Add FAQ</Button>
      </div>

      <div className="space-y-4">
        {faqs.length === 0 ? (
          <p className="text-gray-500 italic dark:text-gray-200">No FAQs found. Add one now!</p>
        ) : (
          faqs.map((faq) => (
            <div
              key={faq.id}
              className="border dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-2 bg-white dark:bg-gray-800"
            >
              <h3 className="font-semibold text-lg dark:text-gray-50">{faq.question}</h3>
              <p className="text-gray-700 dark:text-gray-200">{faq.answer}</p>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="primary" onClick={() => handleEdit(faq)}>
                  Edit
                </Button>
                <Button variant="outline" onClick={() => handleDelete(faq.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
      
      <FaqFormModal
        isOpen={isOpen}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        initialData={editingFaq || undefined}
        isSubmitting={isSubmitting} // This can be controlled based on your state
      />
    </div>
    </div>
  );
}
