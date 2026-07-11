-- Allow admin users to read cost_events and fixed_costs from the frontend.
-- The anon key + JWT with role='admin' in profiles will be checked.

create policy "Admins can read cost_events"
  on public.cost_events for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can read fixed_costs"
  on public.fixed_costs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
