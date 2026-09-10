-- SamaGestion — rapports : une agrégation par période, sans tables métier nouvelles

create or replace function public.report_time_buckets(
  p_from timestamptz,
  p_to timestamptz,
  p_granularity text
)
returns table (bucket date)
language sql
stable
as $$
  select d::date
  from generate_series(
    case p_granularity
      when 'week' then date_trunc('week', timezone('Africa/Dakar', p_from))
      when 'month' then date_trunc('month', timezone('Africa/Dakar', p_from))
      else timezone('Africa/Dakar', p_from)::date::timestamp
    end,
    case p_granularity
      when 'week' then date_trunc('week', timezone('Africa/Dakar', p_to - interval '1 millisecond'))
      when 'month' then date_trunc('month', timezone('Africa/Dakar', p_to - interval '1 millisecond'))
      else (timezone('Africa/Dakar', p_to)::date - 1)::timestamp
    end,
    case p_granularity
      when 'week' then interval '7 days'
      when 'month' then interval '1 month'
      else interval '1 day'
    end
  ) as d;
$$;

create or replace function public.report_bucket(p_ts timestamptz, p_granularity text)
returns date
language sql
immutable
as $$
  select case p_granularity
    when 'week' then date_trunc('week', timezone('Africa/Dakar', p_ts))::date
    when 'month' then date_trunc('month', timezone('Africa/Dakar', p_ts))::date
    else timezone('Africa/Dakar', p_ts)::date
  end;
$$;

create or replace function public.report_bucket_date(p_date date, p_granularity text)
returns date
language sql
immutable
as $$
  select case p_granularity
    when 'week' then date_trunc('week', p_date::timestamp)::date
    when 'month' then date_trunc('month', p_date::timestamp)::date
    else p_date
  end;
$$;

create or replace function public.get_reports_bundle(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_granularity text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_current jsonb;
  v_previous jsonb;
  v_series jsonb;
  v_top_sold jsonb;
  v_top_margin jsonb;
  v_unsold jsonb;
  v_low_sold jsonb;
  v_stock jsonb;
  v_low_stock jsonb;
  v_out_stock jsonb;
  v_customers jsonb;
  v_top_customers jsonb;
  v_aging jsonb;
  v_expenses jsonb;
  v_expense_cats jsonb;
  v_expense_series jsonb;
  v_purchases jsonb;
  v_suppliers jsonb;
  v_payments jsonb;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_granularity not in ('day', 'week', 'month') then
    p_granularity := 'day';
  end if;

  v_current := public.financial_summary_for(v_business_id, p_from, p_to);
  v_previous := public.financial_summary_for(v_business_id, p_prev_from, p_prev_to);

  select coalesce(jsonb_agg(row_to_json(serie) order by serie.bucket), '[]'::jsonb)
  into v_series
  from (
    select
      b.bucket,
      coalesce(sum(s.total), 0) as revenue
    from public.report_time_buckets(p_from, p_to, p_granularity) as b(bucket)
    left join public.sales as s
      on s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
      and public.report_bucket(s.created_at, p_granularity) = b.bucket
    group by b.bucket
  ) as serie;

  select coalesce(jsonb_agg(row_to_json(serie) order by serie.bucket), '[]'::jsonb)
  into v_expense_series
  from (
    select
      b.bucket,
      coalesce(sum(e.amount), 0) as amount
    from public.report_time_buckets(p_from, p_to, p_granularity) as b(bucket)
    left join public.expenses as e
      on e.business_id = v_business_id
      and e.status = 'active'
      and e.expense_date >= (p_from at time zone 'Africa/Dakar')::date
      and e.expense_date < (p_to at time zone 'Africa/Dakar')::date
      and public.report_bucket_date(e.expense_date, p_granularity) = b.bucket
    group by b.bucket
  ) as serie;

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.quantity desc), '[]'::jsonb)
  into v_top_sold
  from (
    select
      si.product_name as name,
      sum(si.quantity) as quantity,
      sum(si.total) as revenue,
      sum(si.purchase_price * si.quantity) as cogs,
      sum(si.total) - sum(si.purchase_price * si.quantity) as margin
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by si.product_name
    order by sum(si.quantity) desc
    limit 10
  ) as ranked;

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.margin desc), '[]'::jsonb)
  into v_top_margin
  from (
    select
      si.product_name as name,
      sum(si.total) as revenue,
      sum(si.purchase_price * si.quantity) as cogs,
      sum(si.total) - sum(si.purchase_price * si.quantity) as margin
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by si.product_name
    order by (sum(si.total) - sum(si.purchase_price * si.quantity)) desc
    limit 10
  ) as ranked;

  select coalesce(jsonb_agg(row_to_json(item) order by item.name), '[]'::jsonb)
  into v_unsold
  from (
    select p.name
    from public.products as p
    where p.business_id = v_business_id
      and p.is_active = true
      and not exists (
        select 1
        from public.sale_items as si
        inner join public.sales as s on s.id = si.sale_id
        where si.product_id = p.id
          and s.status = 'completed'
          and s.created_at >= p_from
          and s.created_at < p_to
      )
    order by p.name
    limit 15
  ) as item;

  select coalesce(jsonb_agg(row_to_json(item) order by item.quantity), '[]'::jsonb)
  into v_low_sold
  from (
    select
      si.product_name as name,
      sum(si.quantity) as quantity
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by si.product_name
    having sum(si.quantity) <= 2
    order by sum(si.quantity), si.product_name
    limit 10
  ) as item;

  select jsonb_build_object(
    'products_count', count(*)::bigint,
    'stock_value', coalesce(sum(p.purchase_price * p.stock_quantity), 0),
    'low_stock', count(*) filter (where p.stock_status = 'low')::bigint,
    'out_of_stock', count(*) filter (where p.stock_status = 'out')::bigint
  )
  into v_stock
  from public.products as p
  where p.business_id = v_business_id
    and p.is_active = true;

  select coalesce(jsonb_agg(row_to_json(item) order by item.stock_quantity, item.name), '[]'::jsonb)
  into v_low_stock
  from (
    select p.name, p.stock_quantity, p.minimum_stock
    from public.products as p
    where p.business_id = v_business_id
      and p.is_active = true
      and p.stock_status = 'low'
    order by p.stock_quantity, p.name
    limit 20
  ) as item;

  select coalesce(jsonb_agg(row_to_json(item) order by item.name), '[]'::jsonb)
  into v_out_stock
  from (
    select
      p.name,
      c.name as category,
      (
        select max(s.created_at)
        from public.sale_items as si
        inner join public.sales as s on s.id = si.sale_id
        where si.product_id = p.id
          and s.status = 'completed'
      ) as last_sale_at
    from public.products as p
    left join public.categories as c on c.id = p.category_id
    where p.business_id = v_business_id
      and p.is_active = true
      and p.stock_status = 'out'
    order by p.name
    limit 20
  ) as item;

  select jsonb_build_object(
    'total', (select count(*) from public.customers where business_id = v_business_id),
    'new_count', (
      select count(*) from public.customers
      where business_id = v_business_id
        and created_at >= p_from
        and created_at < p_to
    ),
    'buying_count', (
      select count(distinct customer_id) from public.sales
      where business_id = v_business_id
        and status = 'completed'
        and customer_id is not null
        and created_at >= p_from
        and created_at < p_to
    ),
    'debtors_count', (
      select count(distinct customer_id) from public.sales
      where business_id = v_business_id
        and status = 'completed'
        and customer_id is not null
        and amount_due > 0
    ),
    'receivables_open', (
      select coalesce(sum(amount_due), 0) from public.sales
      where business_id = v_business_id
        and status = 'completed'
        and customer_id is not null
        and amount_due > 0
    )
  )
  into v_customers;

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.spent desc), '[]'::jsonb)
  into v_top_customers
  from (
    select
      c.name,
      count(*)::bigint as sales_count,
      sum(s.total) as spent,
      sum(s.amount_due) as due
    from public.sales as s
    inner join public.customers as c on c.id = s.customer_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by c.id, c.name
    order by sum(s.total) desc
    limit 10
  ) as ranked;

  select jsonb_build_object(
    'd0_7', jsonb_build_object(
      'count', count(*) filter (where age_days <= 7),
      'amount', coalesce(sum(amount_due) filter (where age_days <= 7), 0)
    ),
    'd8_30', jsonb_build_object(
      'count', count(*) filter (where age_days between 8 and 30),
      'amount', coalesce(sum(amount_due) filter (where age_days between 8 and 30), 0)
    ),
    'd31_90', jsonb_build_object(
      'count', count(*) filter (where age_days between 31 and 90),
      'amount', coalesce(sum(amount_due) filter (where age_days between 31 and 90), 0)
    ),
    'd90_plus', jsonb_build_object(
      'count', count(*) filter (where age_days > 90),
      'amount', coalesce(sum(amount_due) filter (where age_days > 90), 0)
    )
  )
  into v_aging
  from (
    select
      s.amount_due,
      ((timezone('Africa/Dakar', now()))::date - (s.created_at at time zone 'Africa/Dakar')::date) as age_days
    from public.sales as s
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.customer_id is not null
      and s.amount_due > 0
  ) as aged;

  select jsonb_build_object(
    'total', coalesce(sum(e.amount), 0),
    'count', count(*)::bigint,
    'average', case when count(*) = 0 then 0 else round(sum(e.amount) / count(*), 2) end
  )
  into v_expenses
  from public.expenses as e
  where e.business_id = v_business_id
    and e.status = 'active'
    and e.expense_date >= (p_from at time zone 'Africa/Dakar')::date
    and e.expense_date < (p_to at time zone 'Africa/Dakar')::date;

  select coalesce(jsonb_agg(row_to_json(cat) order by cat.amount desc), '[]'::jsonb)
  into v_expense_cats
  from (
    select
      coalesce(c.name, 'Sans catégorie') as name,
      sum(e.amount) as amount
    from public.expenses as e
    left join public.expense_categories as c on c.id = e.category_id
    where e.business_id = v_business_id
      and e.status = 'active'
      and e.expense_date >= (p_from at time zone 'Africa/Dakar')::date
      and e.expense_date < (p_to at time zone 'Africa/Dakar')::date
    group by coalesce(c.name, 'Sans catégorie')
    order by sum(e.amount) desc
  ) as cat;

  select jsonb_build_object(
    'total', coalesce(sum(p.total) filter (where p.status = 'completed'), 0),
    'count', count(*) filter (where p.status = 'completed')::bigint,
    'suppliers_count', count(distinct p.supplier_id) filter (where p.status = 'completed' and p.supplier_id is not null)::bigint,
    'payables_open', (
      select coalesce(sum(x.amount_due), 0)
      from public.purchases as x
      where x.business_id = v_business_id
        and x.status = 'completed'
        and x.amount_due > 0
    )
  )
  into v_purchases
  from public.purchases as p
  where p.business_id = v_business_id
    and p.purchase_date >= (p_from at time zone 'Africa/Dakar')::date
    and p.purchase_date < (p_to at time zone 'Africa/Dakar')::date;

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.spent desc), '[]'::jsonb)
  into v_suppliers
  from (
    select
      coalesce(s.name, 'Sans fournisseur') as name,
      count(*)::bigint as purchases_count,
      sum(p.total) as spent,
      sum(p.amount_due) as due
    from public.purchases as p
    left join public.suppliers as s on s.id = p.supplier_id
    where p.business_id = v_business_id
      and p.status = 'completed'
      and p.purchase_date >= (p_from at time zone 'Africa/Dakar')::date
      and p.purchase_date < (p_to at time zone 'Africa/Dakar')::date
    group by coalesce(s.name, 'Sans fournisseur')
    order by sum(p.total) desc
    limit 10
  ) as ranked;

  select coalesce(jsonb_agg(row_to_json(pay) order by pay.amount desc), '[]'::jsonb)
  into v_payments
  from (
    select
      coalesce(s.payment_method, 'other') as method,
      count(*)::bigint as sales_count,
      coalesce(sum(s.total), 0) as amount
    from public.sales as s
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by coalesce(s.payment_method, 'other')
  ) as pay;

  return jsonb_build_object(
    'current', v_current,
    'previous', v_previous,
    'series', v_series,
    'expense_series', v_expense_series,
    'top_sold', v_top_sold,
    'top_margin', v_top_margin,
    'unsold', v_unsold,
    'low_sold', v_low_sold,
    'stock', v_stock,
    'low_stock', v_low_stock,
    'out_of_stock', v_out_stock,
    'customers', v_customers,
    'top_customers', v_top_customers,
    'aging', v_aging,
    'expenses', v_expenses,
    'expense_categories', v_expense_cats,
    'purchases', v_purchases,
    'suppliers', v_suppliers,
    'payments', v_payments
  );
end;
$$;

revoke all on function public.report_time_buckets(timestamptz, timestamptz, text) from public;
revoke all on function public.report_bucket(timestamptz, text) from public;
revoke all on function public.report_bucket_date(date, text) from public;
revoke all on function public.get_reports_bundle(timestamptz, timestamptz, timestamptz, timestamptz, text) from public;

grant execute on function public.get_reports_bundle(timestamptz, timestamptz, timestamptz, timestamptz, text) to authenticated;
