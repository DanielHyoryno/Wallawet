
do $$
declare
  me uuid := '(Your User ID)';
begin
  insert into public.categories (user_id, name, type, color) values
    (me, 'Food',      'expense', '#22d3ee'),
    (me, 'Transport', 'expense', '#a78bfa'),
    (me, 'Income',    'income',  '#34d399')
  on conflict do nothing;
end $$;
