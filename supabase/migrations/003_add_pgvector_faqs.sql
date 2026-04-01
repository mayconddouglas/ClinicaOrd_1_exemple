-- Enable pgvector extension
create extension if not exists vector;

-- Add embedding column to learned_faqs
alter table learned_faqs
add column if not exists embedding vector(768); -- Adjust dimensionality depending on the model (e.g. text-embedding-004 is 768)

-- Create a function to match faqs
create or replace function match_learned_faqs (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  question text,
  answer text,
  category text,
  usage_count int,
  similarity float
)
language sql stable
as $$
  select
    learned_faqs.id,
    learned_faqs.question,
    learned_faqs.answer,
    learned_faqs.category,
    learned_faqs.usage_count,
    1 - (learned_faqs.embedding <=> query_embedding) as similarity
  from learned_faqs
  where 1 - (learned_faqs.embedding <=> query_embedding) > match_threshold
    and learned_faqs.category not like '\_\_%'
  order by similarity desc
  limit match_count;
$$;
