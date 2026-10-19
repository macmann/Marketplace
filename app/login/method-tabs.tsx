"use client";

import { useRef, useState, type ReactNode } from "react";

type Method = "email" | "sms";
export default function MethodTabs({
  initialMethod,
  label,
  emailLabel,
  smsLabel,
  email,
  sms,
}: {
  initialMethod: Method;
  label: string;
  emailLabel: string;
  smsLabel: string;
  email: ReactNode;
  sms: ReactNode;
}) {
  const [method, setMethod] = useState(initialMethod);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const methods: Method[] = ["email", "sms"];
  return (
    <>
      <div className="login-tabs" role="tablist" aria-label={label}>
        {methods.map((value, index) => (
          <button
            key={value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`login-tab-${value}`}
            aria-controls={`login-panel-${value}`}
            aria-selected={method === value}
            tabIndex={method === value ? 0 : -1}
            onClick={() => setMethod(value)}
            onKeyDown={(event) => {
              let next: number;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft")
                next = 1 - index;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = 1;
              else return;
              event.preventDefault();
              setMethod(methods[next]);
              buttons.current[next]?.focus();
            }}
          >
            {value === "email" ? emailLabel : smsLabel}
          </button>
        ))}
      </div>
      {methods.map((value) => (
        <div
          key={value}
          className="login-panel"
          id={`login-panel-${value}`}
          role="tabpanel"
          aria-labelledby={`login-tab-${value}`}
          hidden={method !== value}
          tabIndex={0}
        >
          {value === "email" ? email : sms}
        </div>
      ))}
    </>
  );
}
