# Phase 1A DB/RLS/Auth SQL Verification

Run only against a local Supabase database or a disposable staging database. Do not run these checks against production.

Replace the placeholder UUIDs and invite code values before running.

## Setup

```sql
-- As a privileged local test operator.
select gen_random_uuid() as normal_user_id \gset
select gen_random_uuid() as admin_user_id \gset

insert into auth.users (id, email)
values
  (:'normal_user_id', 'phase1-normal@example.test'),
  (:'admin_user_id', 'phase1-admin@example.test')
on conflict (id) do nothing;

insert into public.profiles (id, email, display_name, role, credits)
values
  (:'normal_user_id', 'phase1-normal@example.test', 'Normal User', 'learner', 0),
  (:'admin_user_id', 'phase1-admin@example.test', 'Admin User', 'admin', 10)
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    credits = excluded.credits;

insert into public.admin_roles (user_id)
values (:'admin_user_id')
on conflict (user_id) do nothing;

insert into public.invite_codes (code, credits, max_uses, is_active, created_by)
values ('PHASE1VERIFY', 3, 1, true, :'admin_user_id')
on conflict (code) do update
set credits = excluded.credits,
    max_uses = excluded.max_uses,
    is_active = true;
```

## Normal User Claims

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'normal_user_id';
set local request.jwt.claim.role = 'authenticated';

select public.is_admin() as normal_is_admin; -- expected: false

update public.profiles
set display_name = 'Normal User Updated'
where id = :'normal_user_id'; -- expected: succeeds

update public.profiles
set role = 'admin'
where id = :'normal_user_id'; -- expected: permission denied

update public.profiles
set credits = credits + 100
where id = :'normal_user_id'; -- expected: permission denied

insert into public.admin_roles (user_id)
values (:'normal_user_id'); -- expected: denied by RLS

select * from public.invite_codes; -- expected: zero rows or denied, not listable

rollback;
```

## Invite Redemption

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'normal_user_id';
set local request.jwt.claim.role = 'authenticated';

select public.redeem_invite_code('PHASE1VERIFY') as first_redeem;
-- expected: {"success": true, "credits_awarded": 3}

select credits from public.profiles where id = :'normal_user_id';
-- expected: credits increased by 3

select public.redeem_invite_code('PHASE1VERIFY') as second_redeem_same_user;
-- expected: {"success": false, "error": "...already redeemed..."}

rollback;
```

## Admin Claims

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'admin_user_id';
set local request.jwt.claim.role = 'authenticated';

select public.is_admin() as admin_is_admin; -- expected: true

update public.profiles
set credits = credits + 1
where id = :'normal_user_id'; -- expected: succeeds for admin

update public.profiles
set role = 'admin'
where id = :'normal_user_id'; -- expected: succeeds for admin and syncs admin_roles

select exists (
  select 1 from public.admin_roles where user_id = :'normal_user_id'
) as role_synced; -- expected: true

select * from public.invite_codes where code = 'PHASE1VERIFY';
-- expected: admin can read/manage invite codes

rollback;
```

## Dangerous Function Grants

```sql
begin;
set local role authenticated;
set local request.jwt.claim.sub = :'normal_user_id';
set local request.jwt.claim.role = 'authenticated';

select public.refund_credit(:'normal_user_id'::uuid);
-- expected: permission denied for function refund_credit

rollback;
```

## Reuse/Max-Use Check

Create a second normal user, redeem `PHASE1VERIFY` as the first user, then attempt redeeming as the second user. With `max_uses = 1`, the second redemption should return a failure object indicating maximum uses reached.
