import { Fragment, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  downloadAdminSettlements,
  getAdminSettlements,
  type SettlementDay,
  type SettlementReport,
} from '@/api/admin';
import { Button } from '@/components/common/Button';
import { Spinner } from '@/components/common/Spinner';
import { formatPrice } from '@/components/post/ProductInfo';
import { formatApiError } from '@/utils/formatApiError';

const STATUS_LABELS: Record<string, string> = {
  paid: '결제 완료',
  preparing: '상품 준비 중',
  ready: '포장 완료',
  shipped: '배송 중',
  delivered: '배송 완료',
};

function formatInputDate(day: Date) {
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, '0');
  const date = String(day.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function addMonths(iso: string, months: number) {
  const [year, month, date] = iso.split('-').map(Number);
  const cursor = new Date(year, month - 1 + months, 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  return formatInputDate(new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(date, last)));
}

function dot(iso: string) {
  return iso.replaceAll('-', '.');
}

function formatPaidAt(iso: string) {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return iso;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}.${part('month')}.${part('day')} ${part('hour')}:${part('minute')}`;
}

const CARRIER_LABELS: Record<string, string> = {
  cj: 'CJ대한통운',
  hanjin: '한진택배',
  lotte: '롯데택배',
  epost: '우체국택배',
  logen: '로젠택배',
  kdexp: '경동택배',
  daesin: '대신택배',
};

function fulfillmentLabel(value: string) {
  return value === 'pickup' ? '포장' : '택배';
}

function trackingLabel(carrier: string | null, number: string | null) {
  if (!number) return '-';
  const name = carrier ? CARRIER_LABELS[carrier] : '';
  return name ? `${name} ${number}` : number;
}

function validateRange(start: string, end: string) {
  if (!start || !end) return '조회 기간을 선택해 주세요.';
  if (end < start) return '종료일은 시작일 이후여야 합니다.';
  if (end > addMonths(start, 1)) return '한 번에 최대 1개월까지 조회할 수 있습니다.';
  return '';
}

export function AdminSettlementsPage() {
  const today = formatInputDate(new Date());
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [report, setReport] = useState<SettlementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const search = (nextStart = start, nextEnd = end) => {
    const message = validateRange(nextStart, nextEnd);
    if (message) {
      toast.error(message);
      return;
    }
    setLoading(true);
    setOpenDay(null);
    getAdminSettlements(nextStart, nextEnd)
      .then(setReport)
      .catch((err) => {
        setReport(null);
        toast.error(formatApiError(err, '정산내역을 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    search(today, today);
    // First load uses today. Later searches go through the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    const next = formatInputDate(new Date());
    setStart(next);
    setEnd(next);
    search(next, next);
  };

  const download = async () => {
    const message = validateRange(start, end);
    if (message) {
      toast.error(message);
      return;
    }
    setDownloading(true);
    try {
      await downloadAdminSettlements(start, end);
    } catch (err) {
      toast.error(formatApiError(err, '엑셀 파일을 만들지 못했습니다.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">정산내역</h1>
          <p className="mt-1 text-sm text-ig-text-secondary">
            결제 완료된 주문을 결제일 기준으로 모았습니다. 취소된 주문은 빠집니다.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={download} disabled={downloading || loading}>
          {downloading ? '받는 중' : '엑셀 다운로드'}
        </Button>
      </div>

      <form
        className="bg-white border border-ig-border rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label className="text-sm">
          <span className="block mb-1 text-ig-text-secondary">시작일</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="h-10 border border-ig-border rounded-lg px-3 bg-white"
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1 text-ig-text-secondary">종료일</span>
          <input
            aria-label="종료일"
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="h-10 border border-ig-border rounded-lg px-3 bg-white"
          />
        </label>
        <Button type="submit">조회</Button>
        <Button type="button" variant="secondary" onClick={reset}>
          초기화
        </Button>
        <p className="text-xs text-ig-text-secondary pb-2">한 번에 최대 1개월까지 조회할 수 있습니다.</p>
      </form>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 md:gap-4 mb-4">
            <SummaryCard label="정산금액" value={formatPrice(report?.summary.total_amount ?? 0)} />
            <SummaryCard label="상품금액" value={formatPrice(report?.summary.subtotal ?? 0)} />
            <SummaryCard label="배송비" value={formatPrice(report?.summary.shipping_fee ?? 0)} />
            <SummaryCard label="주문" value={`${(report?.summary.order_count ?? 0).toLocaleString('ko-KR')}건`} />
          </div>

          <div className="bg-white border border-ig-border rounded-xl overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="text-left text-ig-text-secondary border-b border-ig-border">
                <tr>
                  <th className="px-4 py-3 font-medium">정산일</th>
                  <th className="px-4 py-3 font-medium text-right">주문</th>
                  <th className="px-4 py-3 font-medium text-right">상품금액</th>
                  <th className="px-4 py-3 font-medium text-right">배송비</th>
                  <th className="px-4 py-3 font-medium text-right">정산금액</th>
                </tr>
              </thead>
              <tbody>
                {report && report.days.length > 0 ? (
                  report.days.map((day) => (
                    <DayRows
                      key={day.settlement_date}
                      day={day}
                      open={openDay === day.settlement_date}
                      onToggle={() => setOpenDay(openDay === day.settlement_date ? null : day.settlement_date)}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-ig-text-secondary">
                      이 기간에 정산할 결제가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function fulfillmentSummary(day: SettlementDay) {
  const delivery = day.orders.filter((order) => order.fulfillment_type !== 'pickup').length;
  const pickup = day.orders.length - delivery;
  return `택배 ${delivery}건 · 포장 ${pickup}건`;
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="inline text-ig-text-secondary">{label} </dt>
      <dd className="inline break-keep">{value}</dd>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-ig-border rounded-xl px-3 py-3 md:p-5">
      <p className="text-xs md:text-sm text-ig-text-secondary mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DayRows({ day, open, onToggle }: { day: SettlementDay; open: boolean; onToggle: () => void }) {
  return (
    <Fragment>
      <tr className="border-t border-ig-border">
        <td className="px-4 py-3">
          <div>{dot(day.settlement_date)}</div>
          <button type="button" onClick={onToggle} className="mt-1 text-sm font-semibold text-ig-primary">
            {open ? '접기' : '주문 보기'}
          </button>
          <p className="mt-1 text-xs text-ig-text-secondary">{fulfillmentSummary(day)}</p>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{day.order_count}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(day.subtotal)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatPrice(day.shipping_fee)}</td>
        <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatPrice(day.total_amount)}</td>
      </tr>
      {open && (
        <tr className="bg-neutral-50">
          <td colSpan={5} className="px-4 py-3">
            <div className="space-y-3">
              {day.orders.map((order) => (
                <div key={order.order_id} className="rounded-lg border border-ig-border bg-white px-3 py-3 text-xs">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold">#{order.order_id}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium">
                      {fulfillmentLabel(order.fulfillment_type)}
                    </span>
                    <span>{STATUS_LABELS[order.status] || order.status}</span>
                    <span className="text-ig-text-secondary">{formatPaidAt(order.paid_at)}</span>
                    <span className="ml-auto font-semibold tabular-nums">{formatPrice(order.total_amount)}</span>
                  </div>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                    <Detail label="아이디" value={`@${order.username}`} />
                    <Detail label="실명" value={order.shipping_name || '-'} />
                    <Detail label="핸드폰번호" value={order.phone || '-'} />
                    <Detail label="운송장번호" value={trackingLabel(order.carrier, order.tracking_number)} />
                    <Detail label="주소" value={order.address || '-'} wide />
                    <Detail label="상품" value={`${order.product_name} · ${formatPrice(order.subtotal)}`} />
                    <Detail label="배송비" value={formatPrice(order.shipping_fee)} />
                  </dl>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
