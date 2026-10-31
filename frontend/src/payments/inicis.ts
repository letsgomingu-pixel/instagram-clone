export interface InicisCheckout {
  js_url: string;
  fields: Record<string, string>;
}

declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void;
    };
  }
}

const FORM_ID = 'inicis-pay-form';

function loadScript(src: string): Promise<void> {
  if (window.INIStdPay) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>('script[data-inicis="1"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('이니시스 결제 모듈을 불러오지 못했습니다.')), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.charset = 'UTF-8';
    script.dataset.inicis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('이니시스 결제 모듈을 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
}

export async function openInicisPayment(checkout: InicisCheckout): Promise<void> {
  await loadScript(checkout.js_url);
  if (!window.INIStdPay) {
    throw new Error('이니시스 결제 모듈을 불러오지 못했습니다.');
  }

  let form = document.getElementById(FORM_ID) as HTMLFormElement | null;
  if (!form) {
    form = document.createElement('form');
    form.id = FORM_ID;
    form.method = 'POST';
    form.acceptCharset = 'UTF-8';
    form.style.position = 'absolute';
    form.style.left = '-9999px';
    form.setAttribute('accept-charset', 'UTF-8');
    document.body.appendChild(form);
  }
  const origin = window.location.origin;
  const fields = {
    ...checkout.fields,
    returnUrl: `${origin}/api/v1/payments/inicis/return`,
    closeUrl: `${origin}/api/v1/payments/inicis/close`,
  };
  form.replaceChildren();
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  window.INIStdPay.pay(FORM_ID);
}
