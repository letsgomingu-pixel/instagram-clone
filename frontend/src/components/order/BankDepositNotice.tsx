import { formatPrice } from '@/components/post/ProductInfo';

export interface BankAccount {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface BankDepositNoticeProps {
  account: BankAccount;
  amount: number;
  depositorName?: string;
}

export function BankDepositNotice({ account, amount, depositorName }: BankDepositNoticeProps) {
  return (
    <div className="rounded-lg border border-ig-border bg-ig-secondary px-4 py-3 text-sm space-y-2">
      <p className="font-semibold">아래 계좌로 입금해 주세요.</p>
      <dl className="space-y-1">
        <div className="flex justify-between gap-3">
          <dt className="text-ig-text-secondary">은행</dt>
          <dd className="font-semibold">{account.bank_name}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ig-text-secondary">계좌번호</dt>
          <dd className="font-semibold">{account.account_number}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ig-text-secondary">예금주</dt>
          <dd className="font-semibold">{account.account_holder}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ig-text-secondary">입금 금액</dt>
          <dd className="font-semibold text-ig-primary">{formatPrice(amount)}</dd>
        </div>
      </dl>
      <p className="text-xs text-ig-text-secondary">
        {depositorName
          ? `입금자명은 ${depositorName}으로 적어 주세요. 입금이 확인되면 주문이 진행됩니다.`
          : '입금자명은 주문자 이름과 같게 적어 주세요. 입금이 확인되면 주문이 진행됩니다.'}
      </p>
    </div>
  );
}
