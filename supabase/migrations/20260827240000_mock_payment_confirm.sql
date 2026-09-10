-- Paiement mock utilisable sans SUPABASE_SERVICE_ROLE_KEY (env test uniquement)

create or replace function public.confirm_mock_test_payment(
  p_internal_reference text,
  p_success boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_tx public.subscription_transactions;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_tx
  from public.subscription_transactions
  where internal_reference = btrim(p_internal_reference)
    and business_id = v_business_id
  for update;

  if not found then
    raise exception 'TRANSACTION_NOT_FOUND';
  end if;

  -- Uniquement transactions de test mock de CE commerce
  if v_tx.environment <> 'test' then
    raise exception 'MOCK_ONLY_IN_TEST';
  end if;

  if v_tx.provider not in ('mock', 'pending') then
    raise exception 'NOT_A_MOCK_TRANSACTION';
  end if;

  v_result := public.confirm_subscription_payment(
    v_tx.internal_reference,
    'mock',
    coalesce(v_tx.provider_transaction_id, 'mock_' || v_tx.internal_reference),
    v_tx.amount,
    v_tx.currency,
    case when p_success then 'successful' else 'failed' end,
    case when p_success then 'payment.success' else 'payment.failed' end,
    'test',
    jsonb_build_object('source', 'mock_authenticated_simulate')
  );

  return v_result;
end;
$$;

revoke all on function public.confirm_mock_test_payment(text, boolean) from public;
grant execute on function public.confirm_mock_test_payment(text, boolean) to authenticated;

-- Autoriser aussi service_role à confirmer (webhooks réels)
grant execute on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) to service_role;
