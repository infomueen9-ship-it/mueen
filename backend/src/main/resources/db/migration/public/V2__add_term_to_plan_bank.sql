ALTER TABLE public.plan_bank
    ADD COLUMN IF NOT EXISTS term_id BIGINT REFERENCES public.terms(id);

CREATE INDEX IF NOT EXISTS idx_plan_bank_term_id
    ON public.plan_bank(term_id);

UPDATE public.plan_bank
SET term_id = 209
WHERE id = 4
  AND term_id IS NULL;
