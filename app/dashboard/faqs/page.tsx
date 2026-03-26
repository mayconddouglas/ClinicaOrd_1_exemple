'use client';

import { useEffect, useState } from 'react';
import { getLearnedFAQs } from '../../../lib/dashboard-tools';
import { BookOpen, TrendingUp } from 'lucide-react';

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFaqs() {
      const res = await getLearnedFAQs();
      if (res.success) setFaqs(res.data || []);
      setLoading(false);
    }
    fetchFaqs();
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2 md:gap-3">
          <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" /> Base de Conhecimento (FAQ)
        </h1>
        <p className="text-sm md:text-base text-slate-500 mt-1">Perguntas e respostas aprendidas automaticamente pelo OrthoAI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {faqs.length === 0 ? (
          <div className="col-span-full bg-white p-6 md:p-8 rounded-2xl border border-slate-200 text-center text-sm md:text-base text-slate-500">Nenhuma resposta aprendida ainda.</div>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {faq.category || 'Geral'}
                </span>
                <div className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                  <TrendingUp className="w-3 h-3" /> Usado {faq.usage_count}x
                </div>
              </div>
              <h3 className="text-sm md:text-base font-bold text-slate-900 mb-2">Q: {faq.question}</h3>
              <div className="flex-1 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                <p className="text-xs md:text-sm text-slate-600 leading-relaxed">A: {faq.answer}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
