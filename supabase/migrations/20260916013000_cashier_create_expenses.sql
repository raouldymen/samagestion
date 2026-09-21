-- Un caissier peut enregistrer une dépense, sans pouvoir la modifier ou la supprimer ensuite.
create or replace function public.create_expense(
  p_description text,
  p_category_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_expense_date date,
  p_notes text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_expense public.expenses;
begin
  if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if public.current_member_role() not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if p_description is null or btrim(p_description) = '' then raise exception 'DESCRIPTION_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_expense_date is null then raise exception 'DATE_REQUIRED'; end if;
  if p_payment_method is null or p_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then raise exception 'INVALID_PAYMENT_METHOD'; end if;
  if p_category_id is null or not exists (
    select 1 from public.expense_categories where id = p_category_id and business_id = v_business_id
  ) then raise exception 'INVALID_CATEGORY'; end if;

  insert into public.expenses (
    business_id, category_id, description, amount, payment_method, expense_date, notes, created_by
  ) values (
    v_business_id, p_category_id, btrim(p_description), p_amount, p_payment_method, p_expense_date,
    nullif(btrim(coalesce(p_notes, '')), ''), v_user_id
  ) returning * into v_expense;

  return v_expense;
end;
$$;

revoke all on function public.create_expense(text, uuid, numeric, text, date, text) from public;
grant execute on function public.create_expense(text, uuid, numeric, text, date, text) to authenticated;
