-- Secure, atomic fee collection for the existing fee_records/payments ledger.
-- No direct INSERT/UPDATE grants are added to either table; authenticated school
-- office users must use this function so the ledger and payment history stay in sync.

create or replace function public.record_school_fee_payment(
  p_fee_record_id uuid,
  p_amount numeric,
  p_method text,
  p_notes text default null
)
returns table(payment_id uuid, receipt_number text, new_paid_amount numeric, new_remaining_amount numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_fee public.fee_records%rowtype;
  v_total_due numeric;
  v_remaining numeric;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_payment_id uuid;
  v_receipt text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.role::text into v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active';

  if v_role not in ('superadmin','admin') or v_role is null then
    raise exception 'Only active school office accounts can record fee payments';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount = 'NaN'::numeric then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_method not in ('cash','bank_transfer','easypaisa','jazzcash','other') then
    raise exception 'Unsupported payment method';
  end if;

  select * into v_fee
  from public.fee_records
  where id = p_fee_record_id
  for update;

  if not found then
    raise exception 'Fee record not found';
  end if;

  v_total_due := coalesce(v_fee.total_due, v_fee.fee_amount - v_fee.discount_amount + v_fee.previous_balance);
  v_remaining := coalesce(v_fee.remaining_amount, greatest(v_total_due - v_fee.paid_amount, 0));

  if p_amount > v_remaining then
    raise exception 'Payment exceeds remaining balance (%).', v_remaining;
  end if;

  v_new_paid := v_fee.paid_amount + p_amount;
  v_new_remaining := greatest(v_remaining - p_amount, 0);
  v_payment_id := gen_random_uuid();
  v_receipt := 'PMPS-' || to_char((now() at time zone 'Asia/Karachi')::date, 'YYYYMMDD') || '-' ||
               upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payments (
    id, student_id, fee_record_id, receipt_number, amount, payment_method,
    payment_date, notes, created_by, status, is_overpayment, client_id
  ) values (
    v_payment_id, v_fee.student_id, v_fee.id, v_receipt, p_amount, p_method,
    (now() at time zone 'Asia/Karachi')::date, nullif(trim(p_notes), ''),
    v_user_id, 'active', false, gen_random_uuid()
  );

  update public.fee_records
  set paid_amount = v_new_paid,
      total_due = v_total_due,
      remaining_amount = v_new_remaining,
      status = case when v_new_remaining = 0 then 'paid' else 'unpaid' end
  where id = v_fee.id;

  return query select v_payment_id, v_receipt, v_new_paid, v_new_remaining;
end;
$$;

revoke all on function public.record_school_fee_payment(uuid,numeric,text,text) from public;
revoke all on function public.record_school_fee_payment(uuid,numeric,text,text) from anon;
grant execute on function public.record_school_fee_payment(uuid,numeric,text,text) to authenticated;
