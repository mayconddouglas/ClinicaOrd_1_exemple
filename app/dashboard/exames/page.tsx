'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Search, Image as ImageIcon, File, ExternalLink, Calendar, User, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ExamesPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patient_exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      console.error('Error fetching exams:', error);
      toast.error('Erro ao carregar exames. Verifique se a tabela "patient_exams" existe.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const filteredExams = exams.filter(exam => 
    exam.patient_phone?.toLowerCase().includes(search.toLowerCase()) ||
    exam.file_name?.toLowerCase().includes(search.toLowerCase()) ||
    exam.ai_analysis?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm">Carregando exames e laudos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            Exames e Laudos (IA)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualize os exames enviados pelos pacientes e as análises preliminares feitas pela IA.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por paciente, nome do arquivo ou conteúdo do laudo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* List */}
      <div className="grid gap-6">
        {filteredExams.length === 0 ? (
          <div className="text-center p-12 border border-dashed rounded-xl bg-slate-50">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum exame encontrado</h3>
            <p className="text-slate-500 mt-1">Os pacientes ainda não enviaram exames pelo chat.</p>
          </div>
        ) : (
          filteredExams.map((exam) => (
            <Card key={exam.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Left side: File Info */}
                <div className="bg-slate-50 p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {exam.file_type?.includes('image') ? (
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                          <File className="h-5 w-5" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={exam.file_name}>{exam.file_name}</p>
                        <p className="text-xs text-muted-foreground uppercase">{exam.file_type?.split('/')[1] || 'Arquivo'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="h-4 w-4 text-slate-400" />
                        <span>Paciente: <span className="font-medium">{exam.patient_phone}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>Enviado em: {new Date(exam.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-6 gap-2" asChild>
                    <a href={exam.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Visualizar Arquivo Original
                    </a>
                  </Button>
                </div>

                {/* Right side: AI Analysis */}
                <div className="p-6 md:w-2/3">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold text-slate-900">Análise Preliminar da IA</h3>
                    <Badge variant="secondary" className="ml-auto bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      Gerado por Gemini Vision
                    </Badge>
                  </div>
                  
                  <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {exam.ai_analysis || 'Nenhuma análise disponível.'}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Atenção: Esta é uma análise automatizada e requer validação médica.
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
