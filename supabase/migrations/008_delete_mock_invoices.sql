-- Delete all mock invoices that were created with the 'pag.ae' link
DELETE FROM public.invoices WHERE payment_link LIKE '%pag.ae%';
