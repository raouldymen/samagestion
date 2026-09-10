-- Vérifie qu'un UPDATE direct de stock_quantity est bloqué.
-- Le bloc nettoie toujours les lignes temporaires.

do $$
declare
  v_business uuid;
  v_product uuid;
  v_caught boolean := false;
begin
  insert into public.businesses (name)
  values ('__tmp_stock_guard__')
  returning id into v_business;

  insert into public.products (business_id, name, stock_quantity)
  values (v_business, 'Tmp', 0)
  returning id into v_product;

  begin
    update public.products
    set stock_quantity = 10
    where id = v_product;
  exception
    when others then
      if sqlerrm like '%STOCK_MUST_USE_RPC%' then
        v_caught := true;
      else
        raise;
      end if;
  end;

  delete from public.products where id = v_product;
  delete from public.businesses where id = v_business;

  if not v_caught then
    raise exception 'stock trigger did not block direct update';
  end if;
end $$;
