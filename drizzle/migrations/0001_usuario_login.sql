alter table public.perfiles add column if not exists usuario text;
update public.perfiles set usuario = lower(split_part(email,'@',1)) where usuario is null and email <> '';
create unique index if not exists perfiles_usuario_unico on public.perfiles (lower(usuario));
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_role public.app_role;
begin
  insert into public.perfiles (id, nombre, email, usuario)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), coalesce(new.email,''), nullif(lower(new.raw_user_meta_data->>'usuario'),''));
  if new.raw_user_meta_data->>'rol' in ('admin','tecnico','rrhh') then
    v_role := (new.raw_user_meta_data->>'rol')::public.app_role;
  elsif exists (select 1 from public.user_roles where role = 'admin') then
    v_role := 'tecnico';
  else
    v_role := 'admin';
  end if;
  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end; $$;