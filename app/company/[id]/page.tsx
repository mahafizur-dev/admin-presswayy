import SOPForm from "@/components/SOPForm";
import ChatbotInterface from "@/components/ChatbotInterface";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanySOPPage({ params }: PageProps) {
  const { id: companyId } = await params;

  // সিকিউরিটি বা ভ্যালিডেশন চেক
  if (!companyId || companyId.length < 5) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      

      {/* মেইন কন্টেইনার: গ্রিড লেআউট */}
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* বাম পাশ: SOP Form (বেশি জায়গা নিবে) */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* এখানে SOPForm সরাসরি রেন্ডার হবে */}
              <SOPForm companyId={companyId} />
            </div>
          </div>

          {/* ডান পাশ: Chatbot Interface (ফিক্সড/স্টিকি থাকবে) */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8">
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                
                {/* চ্যাটবট কম্পোনেন্ট */}
                <ChatbotInterface companyId={companyId} />
              </div>

              
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
