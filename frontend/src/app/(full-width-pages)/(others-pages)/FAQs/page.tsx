"use client";
import React, { useState,useEffect } from "react";
// import FaqFormModal from "@/components/form/form-elements/FaqFormModal";
// import { useModal } from "@/hooks/useModal"; 
import { API_BASE_URL } from "@/lib/constants";
type Faq = {
  id: string;
  question: string;
  answer: string;
};

export default function ManageFaqsPage() {
    const [faqs, setFaqs] = useState<Faq[]>([]); 

    useEffect(() => {
      const fetchFaqs = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/admin/faqs/`);
          if (!res.ok) throw new Error("Failed to fetch FAQs");
          const data: { faqs: Faq[] } = await res.json(); 
          setFaqs(data.faqs); 
        } catch (error) {
          console.error("Error fetching FAQs:", error);
        }
      };
    
      fetchFaqs();
    }, []);
    
    return (
      <div className="flex items-center justify-center">
      <div className="p-6 space-y-6 w-5/6 lg:w-[800px] max-w-full h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
             Frequently Asked Questions
          </h1>
        </div>
  
        <div className="space-y-4">
          {faqs.length === 0 ? (
            <p className="text-gray-500 italic">
               No FAQs available.
            </p>
          ) : (
            faqs.map((faq) => (
              <div
                key={faq.id}
                className="border dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-2 bg-white dark:bg-gray-800 dark:text-gray-50"
              >
                <h3 className="font-semibold text-lg">{faq.question}</h3>
                <p className="text-gray-700 dark:text-gray-100">{faq.answer}</p>
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    );
  }